import { CommandBase, type CommandContext } from '@/core/command/Command';
import { PATH } from '@/config/constants';

export class ReloadCommand extends CommandBase {
	public constructor() {
		super({
			name: 'reload',
			description: 'command.reload.description',
			aliases: ['rl'],
			usage: 'command.reload.usage',
			permission: 'alden.command.reload',
		});
	}

	public async execute({ message, lang }: CommandContext): Promise<void> {
		await this.bot.sendMessage(
			{ msg: this.t('command.reload.reloading_all', {}, lang) },
			message.threadId,
			message.type,
		);

		try {
			await this.bot.pluginManager.unloadAll();
			await this.bot.pluginManager.loadAll(PATH.PLUGINS_DIR);
			await this.bot.pluginManager.enableAll();

			const count = this.bot.pluginManager.getPlugins().size;
			await this.bot.sendMessage(
				{ msg: this.t('command.reload.success_all', { count }, lang) },
				message.threadId,
				message.type,
			);
		} catch (error) {
			this.logger.error('Failed to reload plugins', error);

			await this.bot.sendMessage(
				{ msg: this.t('command.reload.failed', {}, lang) },
				message.threadId,
				message.type,
			);
		}
	}
}
