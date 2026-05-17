import type { Message } from 'zca-js';
import { describe, expect, it, vi } from 'vitest';

import type { AldenBot } from '@/core/AldenBot';
import { EventManager } from '@/core/event/EventManager';
import { LiveLocationEvent } from '@/core/event/LiveLocationEvent';
import { LocationEvent } from '@/core/event/LocationEvent';
import { SessionManager } from '@/core/session/SessionManager';

function createMessage(): Message {
	return {
		threadId: 'thread-1',
		type: 1,
		data: {
			uidFrom: 'user-1',
			dName: 'User',
			content: '',
		},
	} as unknown as Message;
}

function createSessionManager(): {
	eventManager: EventManager;
	sessionManager: SessionManager;
} {
	const eventManager = new EventManager();
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn(),
	};
	logger.child.mockReturnValue(logger);

	const bot = {
		eventManager,
		logger,
	} as unknown as AldenBot;

	return {
		eventManager,
		sessionManager: new SessionManager(bot),
	};
}

describe('SessionManager', () => {
	it('routes live location events to multi-event sessions', async () => {
		const { eventManager, sessionManager } = createSessionManager();
		const message = createMessage();

		const pending = sessionManager.waitForAny<LocationEvent | LiveLocationEvent>(
			[LocationEvent, LiveLocationEvent],
			message.threadId,
			message.data.uidFrom,
			1000,
		);

		const event = new LiveLocationEvent(message, {
			latitude: 10.1,
			longitude: 106.2,
		});
		await eventManager.call(event);

		await expect(pending).resolves.toBe(event);
	});

	it('keeps single-event sessions scoped to the requested event class', async () => {
		const { eventManager, sessionManager } = createSessionManager();
		const message = createMessage();

		const pending = sessionManager.waitFor(
			LocationEvent,
			message.threadId,
			message.data.uidFrom,
			1000,
		);

		await eventManager.call(
			new LiveLocationEvent(message, {
				latitude: 10.1,
				longitude: 106.2,
			}),
		);

		const location = new LocationEvent(message, {
			latitude: 10.1,
			longitude: 106.2,
			placeId: 'place-1',
			title: 'Home',
			description: 'District 1',
		});
		await eventManager.call(location);

		await expect(pending).resolves.toBe(location);
	});
});
