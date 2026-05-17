import type { CommandContext } from '@/core/command/Command';
import { CommandBase } from '@/core/command/Command';

export class LanguageCommand extends CommandBase {
	public constructor() {
		super({
			name: 'language',
			description: 'command.language.description',
			aliases: ['lang'],
			cooldown: 3,
			usage: 'command.language.usage',
			permission: 'alden.command.language',
		});
	}

	public async execute({ message, args, lang }: CommandContext): Promise<void> {
		const userId = message.data.uidFrom;

		if (args.length === 0) {
			const available = this.bot.getAvailableLanguages();
			await this.bot.sendMessage(
				{
					msg: this.t(
						'command.language.current',
						{ lang, available: available.join(', ') },
						lang,
					),
				},
				message.threadId,
				message.type,
			);
			return;
		}

		const newLang = args[0]!.toLowerCase();
		const available = this.bot.getAvailableLanguages();

		if (!available.includes(newLang)) {
			await this.bot.sendMessage(
				{
					msg: this.t(
						'command.language.not_found',
						{ lang: newLang, available: available.join(', ') },
						lang,
					),
				},
				message.threadId,
				message.type,
			);
			return;
		}

		await this.bot.setUserLanguage(userId, newLang);
		await this.bot.sendMessage(
			{
				msg: this.t('command.language.changed', { lang: newLang }, newLang),
			},
			message.threadId,
			message.type,
		);
	}
}
