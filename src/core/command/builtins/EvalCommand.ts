import vm from 'node:vm';
import { CommandBase, type CommandContext } from '@/core/command/Command';
import { inspect } from 'node:util';

export class EvalCommand extends CommandBase {
	public constructor() {
		super({
			name: 'eval',
			description: 'command.eval.description',
			usage: 'command.eval.usage',
			permission: 'alden.command.eval',
		});
	}

	public async execute({ message, args, lang }: CommandContext): Promise<void> {
		const code = args.join(' ');
		if (!code) {
			await this.bot.sendMessage(
				{ msg: this.t('command.eval.no_code', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		try {
			let result = vm.runInNewContext(
				code,
				{
					ctx: {
						this: this,
						message,
						args,
						lang,
					},
				},
				{ timeout: 15000 },
			);
			if (result instanceof Promise) {
				result = await result;
			}

			const raw = typeof result === 'string' ? result : inspect(result);
			const output = raw.length > 2000 ? raw.slice(0, 2000) + '\n... (truncated)' : raw;
			await this.bot.sendMessage(
				{ msg: this.t('command.eval.success', { output }, lang) },
				message.threadId,
				message.type,
			);
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			await this.bot.sendMessage(
				{ msg: this.t('command.eval.error', { error: errMsg }, lang) },
				message.threadId,
				message.type,
			);
		}
	}
}
