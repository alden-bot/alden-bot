import { CommandBase, type CommandContext } from '@/core/command/Command';

export class CancelCommand extends CommandBase {
	public constructor() {
		super({
			name: 'cancel',
			description: 'command.cancel.description',
			aliases: ['c', 'stop'],
			permission: 'alden.command.cancel',
		});
	}

	public async execute({ message, lang }: CommandContext): Promise<void> {
		const cancelled = this.bot.sessionManager.cancelSessionByUser(
			message.threadId,
			message.data.uidFrom,
		);

		if (cancelled) {
			await this.bot.sendMessage(
				{ msg: this.t('command.cancel.success', {}, lang) },
				message.threadId,
				message.type,
			);
		} else {
			await this.bot.sendMessage(
				{ msg: this.t('command.cancel.empty', {}, lang) },
				message.threadId,
				message.type,
			);
		}
	}
}
