import type { API, Message } from 'zca-js';

import type { AldenBot } from '@/core/AldenBot';
import type { I18nManager } from '@/i18n/I18nManager';
import type { Logger } from '@/shared/logger';

export interface CommandContext {
	/**
	 * Direct Zalo API reference.
	 * @deprecated Prefer `this.bot.api` for consistency. Kept for backward compatibility.
	 */
	api: API;
	message: Message;
	args: string[];
	lang: string;
}

export interface CommandOptions {
	name: string;
	description: string;
	aliases?: string[];
	cooldown?: number;
	usage?: string;
	permission?: string;
	permissionMessage?: string;
}

export abstract class CommandBase {
	public readonly name: string;
	public readonly description: string;
	public readonly aliases: string[];
	public readonly cooldown: number;
	public readonly usage: string;

	private readonly permission?: string;
	private readonly permissionMessage?: string;

	protected logger!: Logger;
	protected bot!: AldenBot;

	public i18n?: I18nManager;

	constructor(options: CommandOptions) {
		this.name = options.name;
		this.description = options.description;
		this.aliases = options.aliases ?? [];
		this.cooldown = options.cooldown ?? 0;
		this.usage = options.usage ?? '';
		this.permission = options.permission;
		this.permissionMessage = options.permissionMessage;
	}

	public getPermission(): string | undefined {
		return this.permission;
	}

	public getPermissionMessage(): string | undefined {
		return this.permissionMessage;
	}

	protected t(
		key: string,
		variables: Record<string, string | number> = {},
		locale?: string,
	): string {
		if (this.i18n?.has(key, locale)) {
			return this.i18n.get(key, variables, locale);
		}
		return this.bot.i18n.get(key, variables, locale);
	}

	public resolveDescription(lang?: string): string {
		return this.t(this.description, {}, lang);
	}

	public resolveUsage(lang?: string): string {
		if (!this.usage) return '';
		return this.t(this.usage, {}, lang);
	}

	public init(bot: AldenBot): void {
		this.bot = bot;
		this.logger = this.bot.logger.child(`/${this.name}`);
	}

	public abstract execute(ctx: CommandContext): Promise<unknown> | unknown;
}
