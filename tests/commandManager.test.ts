import { describe, expect, it, vi } from 'vitest';

import type { AldenBot } from '@/core/AldenBot';
import { CommandBase } from '@/core/command/Command';
import { CommandManager } from '@/core/command/CommandManager';

class TestCommand extends CommandBase {
	public constructor(name: string, aliases: string[] = []) {
		super({ name, description: `${name}.description`, aliases });
	}

	public execute(): void {}
}

function createBotStub(): AldenBot {
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn(),
	};
	logger.child.mockReturnValue(logger);

	return {
		logger,
		eventManager: {
			on: vi.fn(() => vi.fn()),
		},
		config: {
			PREFIX: '/',
			REPLY_UNKNOWN_COMMAND: false,
		},
		i18n: {
			get: vi.fn((key: string) => key),
		},
		getUserLanguage: vi.fn(() => 'vi'),
		sendMessage: vi.fn(),
	} as unknown as AldenBot;
}

describe('CommandManager', () => {
	it('rejects duplicate command names and keeps the first registration', () => {
		const manager = new CommandManager(createBotStub());

		expect(manager.register(new TestCommand('ping'))).toBe(true);
		expect(manager.register(new TestCommand('ping'))).toBe(false);

		expect(manager.getAll().map((command) => command.name)).toEqual(['ping']);
	});

	it('rejects alias collisions and keeps the existing command', () => {
		const manager = new CommandManager(createBotStub());

		expect(manager.register(new TestCommand('first', ['same']))).toBe(true);
		expect(manager.register(new TestCommand('second', ['same']))).toBe(false);

		expect(manager.getAll().map((command) => command.name)).toEqual(['first']);
	});

	it('rejects uppercase primary command names', () => {
		const manager = new CommandManager(createBotStub());

		expect(manager.register(new TestCommand('Ping'))).toBe(false);
		expect(manager.getAll()).toEqual([]);
	});
});
