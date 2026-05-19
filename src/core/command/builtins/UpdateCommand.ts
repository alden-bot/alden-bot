import { CommandBase, type CommandContext } from '@/core/command/Command';
import { PATH } from '@/config/constants';
import {
	AWAKE_EXIT_CODE,
	createLauncherRequest,
	isDockerRuntime,
	isLauncherManaged,
	sendLauncherRequest,
	writeLauncherRequest,
} from '@/core/update/RestartProtocol';
import { formatReleaseDate, UpdateService } from '@/core/update/UpdateService';

export class UpdateCommand extends CommandBase {
	public constructor() {
		super({
			name: 'update',
			description: 'command.update.description',
			usage: 'command.update.usage',
			permission: 'alden.command.update',
		});
	}

	public async execute({ message, args, lang }: CommandContext): Promise<void> {
		const action = args[0]?.toLowerCase() ?? 'check';
		if (action !== 'check' && action !== 'apply') {
			await this.bot.sendMessage(
				{ msg: this.t('command.update.invalid_usage', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		if (action === 'apply') {
			await this.applyUpdate(message.threadId, message.type, lang);
			return;
		}

		await this.checkUpdate(message.threadId, message.type, lang);
	}

	private async checkUpdate(
		threadId: string,
		type: CommandContext['message']['type'],
		lang: string,
	) {
		const result = await new UpdateService({ packageJsonPath: PATH.PACKAGE_JSON }).check(
			this.bot.config.version,
		);

		await this.bot.sendMessage({ msg: this.formatCheckResult(result, lang) }, threadId, type);
	}

	private async applyUpdate(
		threadId: string,
		type: CommandContext['message']['type'],
		lang: string,
	) {
		if (isDockerRuntime()) {
			await this.bot.sendMessage(
				{ msg: this.t('command.update.apply_unsupported_docker', {}, lang) },
				threadId,
				type,
			);
			return;
		}

		if (!isLauncherManaged()) {
			await this.bot.sendMessage(
				{ msg: this.t('command.update.apply_requires_launcher', {}, lang) },
				threadId,
				type,
			);
			return;
		}

		const preparation = await new UpdateService({
			packageJsonPath: PATH.PACKAGE_JSON,
		}).prepareApply(this.bot.config.version);

		if (preparation.check.status !== 'available' || !preparation.check.release) {
			await this.bot.sendMessage(
				{ msg: this.formatCheckResult(preparation.check, lang) },
				threadId,
				type,
			);
			return;
		}

		if (!preparation.assets) {
			await this.bot.sendMessage(
				{
					msg: this.t(
						'command.update.apply_missing_assets',
						{ version: preparation.check.latestVersion ?? 'unknown' },
						lang,
					),
				},
				threadId,
				type,
			);
			return;
		}

		const request = createLauncherRequest('update', {
			reason: 'update command',
			release: {
				version: preparation.check.release.version,
				tagName: preparation.check.release.tagName,
				releaseUrl: preparation.check.release.releaseUrl,
				assetName: preparation.assets.assetName,
				assetUrl: preparation.assets.assetUrl,
				checksumAssetName: preparation.assets.checksumAssetName,
				checksumUrl: preparation.assets.checksumUrl,
			},
		});

		await writeLauncherRequest(request);
		sendLauncherRequest(request);

		await this.bot.sendMessage(
			{
				msg: this.t(
					'command.update.apply_started',
					{ version: preparation.check.release.version },
					lang,
				),
			},
			threadId,
			type,
		);

		this.logger.info(
			`Update command requested v${preparation.check.release.version}. Triggering AWAKE restart...`,
		);
		process.exitCode = AWAKE_EXIT_CODE;
		setTimeout(() => {
			process.emit('SIGTERM');
		}, 1000);
	}

	private formatCheckResult(
		result: Awaited<ReturnType<UpdateService['check']>>,
		lang: string,
	): string {
		switch (result.status) {
			case 'available':
				return this.t(
					'command.update.available',
					{
						current: result.currentVersion,
						latest: result.latestVersion ?? 'unknown',
						date: formatReleaseDate(result.release?.publishedAt),
						url: result.release?.releaseUrl ?? 'unknown',
					},
					lang,
				);
			case 'up-to-date':
				return this.t(
					'command.update.up_to_date',
					{ current: result.currentVersion },
					lang,
				);
			case 'ahead':
				return this.t(
					'command.update.ahead',
					{
						current: result.currentVersion,
						latest: result.latestVersion ?? 'unknown',
					},
					lang,
				);
			case 'unavailable':
				return this.t(
					'command.update.unavailable',
					{ reason: result.error ?? 'unknown' },
					lang,
				);
		}
	}
}
