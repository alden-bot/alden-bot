import { ThreadType } from 'zca-js';
import { CommandBase, type CommandContext } from '@/core/command/Command';
import { RichTextParser } from '@/parser/RichTextParser';

const PER_PAGE = 5;

export class HelpCommand extends CommandBase {
	public constructor() {
		super({
			name: 'help',
			description: 'command.help.description',
			aliases: ['?', 'h'],
			cooldown: 3,
			permission: 'alden.command.help',
		});
	}

	public async execute({ message, args, lang }: CommandContext): Promise<unknown> {
		const commands = this.bot.commandManager.getAll();
		const prefix = this.bot.config.PREFIX;

		if (args.length > 0) {
			const arg = args[0]!;
			const pageNum = Number.parseInt(arg, 10);

			if (!Number.isNaN(pageNum)) {
				return this.sendPage(message, commands, prefix, pageNum, lang);
			}

			return this.sendDetail(message, arg, prefix, lang);
		}

		return this.sendPage(message, commands, prefix, 1, lang);
	}

	private async sendDetail(
		message: CommandContext['message'],
		cmdName: string,
		prefix: string,
		lang: string,
	): Promise<void> {
		const commands = this.bot.commandManager.getAll();
		const cmd = commands.find(
			(command) => command.name === cmdName || command.aliases.includes(cmdName),
		);
		if (!cmd) {
			return this.bot.sendMessage(
				RichTextParser.parse(this.t('command.help.not_found', { command: cmdName }, lang)),
				message.threadId,
				message.type,
			);
		}

		const usage = cmd.resolveUsage(lang);
		const reply = this.t(
			'command.help.detail',
			{
				command: cmd.name,
				desc: cmd.resolveDescription(lang),
				aliases: cmd.aliases.length > 0 ? cmd.aliases.join(', ') : 'None',
				cooldown: cmd.cooldown,
				usage: usage ? `${this.bot.config.PREFIX}${cmd.name} ${usage}` : '',
			},
			lang,
		);

		await this.bot.sendMessage(RichTextParser.parse(reply), message.threadId, message.type);
	}

	private async sendPage(
		message: CommandContext['message'],
		allCommands: CommandBase[],
		prefix: string,
		page: number,
		lang: string,
	): Promise<void> {
		const isGroup = message.type === ThreadType.Group;
		const userId = message.data.uidFrom;

		const permitted: CommandBase[] = [];
		for (const cmd of allCommands) {
			const permNode = cmd.getPermission() || '';
			if (
				await this.bot.permissionManager.hasPermission(
					message.threadId,
					userId,
					isGroup,
					permNode,
				)
			) {
				permitted.push(cmd);
			}
		}

		const totalPages = Math.max(1, Math.ceil(permitted.length / PER_PAGE));
		const clampedPage = Math.max(1, Math.min(page, totalPages));
		const start = (clampedPage - 1) * PER_PAGE;
		const slice = permitted.slice(start, start + PER_PAGE);

		let reply = this.t('command.help.list_title', {}, lang);

		for (const cmd of slice) {
			reply += this.t(
				'command.help.list_item',
				{ prefix, name: cmd.name, desc: cmd.resolveDescription(lang) },
				lang,
			);
		}

		if (totalPages > 1) {
			const parts: string[] = [];
			if (clampedPage > 1) {
				parts.push(
					this.t('command.help.page_prev', { page: String(clampedPage - 1) }, lang),
				);
			}
			parts.push(
				this.t(
					'command.help.page_info',
					{ current: String(clampedPage), total: String(totalPages) },
					lang,
				),
			);
			if (clampedPage < totalPages) {
				parts.push(
					this.t('command.help.page_next', { page: String(clampedPage + 1) }, lang),
				);
			}
			reply += '\n' + parts.join(' · ');
		}

		reply += this.t('command.help.usage', {}, lang);

		await this.bot.sendMessage(RichTextParser.parse(reply), message.threadId, message.type);
	}
}
