import { CommandBase, type CommandContext } from '@/core/command/Command';
import {
	AWAKE_EXIT_CODE,
	isLauncherManaged,
	requestLauncherRestart,
} from '@/core/update/RestartProtocol';

export class RestartCommand extends CommandBase {
	public constructor() {
		super({
			name: 'restart',
			description: 'command.restart.description',
			aliases: ['reboot'],
			permission: 'alden.command.restart',
		});
	}

	public async execute({ message, lang }: CommandContext): Promise<void> {
		await this.bot.sendMessage(
			{ msg: this.t('command.restart.restarting', {}, lang) },
			message.threadId,
			message.type,
		);

		if (isLauncherManaged()) {
			await requestLauncherRestart('restart command');
			this.logger.info('Restart command requested AWAKE restart through launcher.');
			process.exitCode = AWAKE_EXIT_CODE;
			setTimeout(() => {
				process.emit('SIGTERM');
			}, 1000);
			return;
		}

		this.logger.info('Restart command emitted. Triggering graceful shutdown...');
		setTimeout(() => {
			process.emit('SIGTERM');
		}, 1000);

		setTimeout(() => {
			this.logger.warn('Graceful shutdown timed out after 10s, forcing exit.');
			process.exit(0);
		}, 11_000);
	}
}
