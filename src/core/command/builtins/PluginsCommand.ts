import { CommandBase, type CommandContext } from '@/core/command/Command';
import { RichTextParser } from '@/parser/RichTextParser';

export class PluginsCommand extends CommandBase {
	public constructor() {
		super({
			name: 'plugins',
			description: 'command.plugins.description',
			aliases: ['pl'],
			permission: 'alden.command.plugins',
		});
	}

	public async execute({ message, lang }: CommandContext): Promise<void> {
		const plugins = this.bot.pluginManager.getPlugins();
		if (plugins.size === 0) {
			await this.bot.sendMessage(
				{ msg: this.t('command.plugins.empty', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		let reply = this.t('command.plugins.list_title', { count: plugins.size }, lang);

		for (const plugin of plugins.values()) {
			const { name, version, author } = plugin.description;
			reply += this.t('command.plugins.plugin_item', { name, version, author }, lang);
		}

		await this.bot.sendMessage(RichTextParser.parse(reply), message.threadId, message.type);
	}
}
