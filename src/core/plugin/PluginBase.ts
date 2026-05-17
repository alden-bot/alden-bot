import path from 'node:path';
import fsp from 'node:fs/promises';
import { ensureDirAsync, existsAsync } from '@/utils/file';
import { PATH } from '@/config/constants';
import type { Logger } from '@/shared/logger';
import type { AldenBot } from '@/core/AldenBot';
import type { CommandBase } from '@/core/command/Command';
import type { I18nManager } from '@/i18n/I18nManager';
import type { Event } from '@/core/event/Event';
import type {
	EventListenerOptions,
	EventConstructor,
	EventHandler,
} from '@/core/event/EventManager';
import type { PluginManifest } from './PluginManifest';

const DEFAULT_PLUGIN_EVENT_PRIORITY = 30;
const PLUGIN_BASE_BRAND = Symbol.for('alden-bot.PluginBase');

interface PluginBaseCandidate {
	[PLUGIN_BASE_BRAND]?: boolean;
	dispose?: unknown;
	onLoad?: unknown;
	onEnable?: unknown;
	onDisable?: unknown;
}

export abstract class PluginBase {
	private readonly _logger: Logger;

	public get logger(): Logger {
		return this._logger;
	}

	private readonly listeners: Array<() => void> = [];
	private readonly commands: Array<CommandBase> = [];
	private readonly registeredServices: string[] = [];

	public i18n?: I18nManager;

	private static readonly SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

	public constructor(
		public readonly description: PluginManifest,
		public readonly bot: AldenBot,
		public readonly pluginPath: string,
	) {
		if (!description?.name) {
			throw new Error('Plugin description must have a name');
		}
		if (!PluginBase.SAFE_NAME_RE.test(description.name)) {
			throw new Error(`Invalid plugin name: ${description.name}`);
		}
		if (!bot) {
			throw new Error('Plugin requires an AldenBot instance');
		}
		Object.defineProperty(this, PLUGIN_BASE_BRAND, {
			value: true,
			enumerable: false,
		});
		this._logger = bot.logger.child(description.name);
	}

	public get dataFolder(): string {
		return path.join(PATH.DATA_DIR, 'plugins', this.description.name);
	}

	public async saveResources(filenames: string | string[], replace = false): Promise<void> {
		const files = Array.isArray(filenames) ? filenames : [filenames];
		for (const filename of files) {
			const src = path.join(this.pluginPath, 'resources', filename);
			const dest = path.join(this.dataFolder, filename);

			if (!replace && (await existsAsync(dest))) continue;

			if (!(await existsAsync(src))) {
				this._logger.warn(`Failed to save resource: File not found at ${src}`);
				continue;
			}

			await ensureDirAsync(path.dirname(dest));
			await fsp.copyFile(src, dest);
		}
	}

	protected registerEvent<T extends Event>(
		eventClass: EventConstructor<T>,
		handler: EventHandler<T>,
		options?: EventListenerOptions | number,
	): void {
		const listenerOptions =
			typeof options === 'number'
				? options
				: { priority: DEFAULT_PLUGIN_EVENT_PRIORITY, ...options };
		const dispose = this.bot.eventManager.on(eventClass, handler, listenerOptions);
		this.listeners.push(dispose);
	}

	protected registerCommand(command: CommandBase): void {
		if (this.i18n) {
			command.i18n = this.i18n;
		}
		if (this.bot.commandManager.register(command)) {
			this.commands.push(command);
		}
	}

	protected scheduleTask(cronExp: string, callback: () => void | Promise<void>): void {
		this.bot.schedulerManager.schedule(this.description.name, cronExp, callback);
	}

	protected registerService<T>(name: string, service: T): void {
		this.bot.registerService(name, service);
		this.registeredServices.push(name);
	}

	protected getService<T>(name: string): T | undefined {
		return this.bot.getService<T>(name);
	}

	public dispose(): void {
		this.bot.schedulerManager.clearTasks(this.description.name);

		for (const unsubscribe of this.listeners) {
			try {
				unsubscribe();
			} catch (err) {
				this.logger.error('Error unsubscribing listener during dispose', err);
			}
		}
		this.listeners.length = 0;

		for (const command of this.commands) {
			try {
				this.bot.commandManager.unregister(command);
			} catch (err) {
				this.logger.error(
					`Error unregistering command /${command.name} during dispose`,
					err,
				);
			}
		}
		this.commands.length = 0;

		for (const name of this.registeredServices) {
			this.bot.unregisterService(name);
		}
		this.registeredServices.length = 0;
	}

	public onLoad(): void | Promise<void> {}

	public onEnable(): void | Promise<void> {}

	public onDisable(): void | Promise<void> {}
}

export function isPluginBaseInstance(value: unknown): value is PluginBase {
	if (typeof value !== 'object' || value === null) return false;

	const candidate = value as PluginBaseCandidate;
	return (
		candidate[PLUGIN_BASE_BRAND] === true &&
		typeof candidate.dispose === 'function' &&
		typeof candidate.onLoad === 'function' &&
		typeof candidate.onEnable === 'function' &&
		typeof candidate.onDisable === 'function'
	);
}
