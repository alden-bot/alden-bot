import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AldenBot } from '@/core/AldenBot';
import { PluginManager } from '@/core/plugin/PluginManager';
import type { Logger } from '@/shared/logger';

let tempRoot: string | undefined;

function createLoggerStub(): Logger {
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn(),
	};
	logger.child.mockReturnValue(logger);
	return logger as unknown as Logger;
}

function createBotStub() {
	const permissionManager = {
		registerPermission: vi.fn(),
		unregisterPermission: vi.fn(),
	};

	const bot = {
		logger: createLoggerStub(),
		config: {
			version: '1.0.0',
		},
		permissionManager,
	} as unknown as AldenBot;

	return { bot, permissionManager };
}

async function createPluginDir(
	name: string,
	mainSource: string,
	options: { locales?: boolean } = {},
): Promise<string> {
	tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'alden-plugin-'));
	const pluginPath = path.join(tempRoot, name);
	await fsp.mkdir(pluginPath, { recursive: true });
	await fsp.writeFile(
		path.join(pluginPath, 'plugin.json'),
		JSON.stringify(
			{
				name,
				version: '1.0.0',
				description: 'Plugin under test',
				author: 'Alden',
				main: 'main.js',
				permissions: {
					'alden.test': 3,
				},
			},
			null,
			2,
		),
	);
	await fsp.writeFile(path.join(pluginPath, 'main.js'), mainSource);
	if (options.locales) {
		const localesDir = path.join(pluginPath, 'resources', 'locales');
		await fsp.mkdir(localesDir, { recursive: true });
		await fsp.writeFile(
			path.join(localesDir, 'vi.json'),
			JSON.stringify({ hello: 'Xin chao' }),
		);
	}
	return pluginPath;
}

describe('PluginManager lifecycle handling', () => {
	afterEach(async () => {
		if (tempRoot) {
			await fsp.rm(tempRoot, { recursive: true, force: true });
			tempRoot = undefined;
		}
	});

	it('rolls back plugin state when onLoad fails', async () => {
		const { bot, permissionManager } = createBotStub();
		const manager = new PluginManager(bot);
		const pluginPath = await createPluginDir(
			'broken-load',
			`
export default class BrokenLoadPlugin {
	constructor(description, bot, pluginPath) {
		this.description = description;
		this.bot = bot;
		this.pluginPath = pluginPath;
	}
	async onLoad() {
		throw new Error('onLoad failed');
	}
	dispose() {}
}
`,
		);

		await expect(manager.loadPlugin(pluginPath)).resolves.toBe(false);
		expect(manager.getPlugin('broken-load')).toBeUndefined();
		expect(permissionManager.registerPermission).toHaveBeenCalledWith('alden.test', 3);
		expect(permissionManager.unregisterPermission).toHaveBeenCalledWith('alden.test');
	});

	it('cleans registry state even when onDisable fails', async () => {
		const { bot, permissionManager } = createBotStub();
		const manager = new PluginManager(bot);
		const pluginPath = await createPluginDir(
			'broken-disable',
			`
export default class BrokenDisablePlugin {
	constructor(description, bot, pluginPath) {
		this.description = description;
		this.bot = bot;
		this.pluginPath = pluginPath;
	}
	async onLoad() {}
	async onDisable() {
		throw new Error('onDisable failed');
	}
	dispose() {}
}
`,
		);

		await expect(manager.loadPlugin(pluginPath)).resolves.toBe(true);
		await expect(manager.unloadPlugin('broken-disable')).resolves.toBe(false);

		expect(manager.getPlugin('broken-disable')).toBeUndefined();
		expect(permissionManager.unregisterPermission).toHaveBeenCalledWith('alden.test');
	});

	it('leaves plugin locale resources under developer control', async () => {
		const { bot } = createBotStub();
		const manager = new PluginManager(bot);
		const pluginPath = await createPluginDir(
			'manual-i18n',
			`
export default class ManualI18nPlugin {
	constructor(description, bot, pluginPath) {
		this.description = description;
		this.bot = bot;
		this.pluginPath = pluginPath;
	}
	async onLoad() {}
	dispose() {}
}
`,
			{ locales: true },
		);

		await expect(manager.loadPlugin(pluginPath)).resolves.toBe(true);

		const plugin = manager.getPlugin('manual-i18n') as { i18n?: unknown } | undefined;
		expect(plugin?.i18n).toBeUndefined();
	});
});
