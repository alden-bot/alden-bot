import { Event } from '@/core/event/Event';
import type { EventConstructor } from '@/core/event/EventManager';
import type { AldenBot } from '@/core/AldenBot';

export class SessionError extends Error {
	constructor(public readonly code: 'TIMEOUT' | 'CANCELLED_BY_USER' | 'OVERRIDDEN') {
		super(`Session closed with code: ${code}`);
		this.name = 'SessionError';
	}
}

export type SessionEvent = Event & {
	message: { threadId: string; data: { uidFrom: string }; type: number };
};

export type SessionValidator<T extends SessionEvent> = (event: T) => Promise<boolean> | boolean;

export class SessionManager {
	private readonly sessions = new Map<
		string,
		{
			reject: (err: Error) => void;
			timeout: NodeJS.Timeout;
		}
	>();

	public constructor(private readonly bot: AldenBot) {}

	public waitFor<T extends SessionEvent>(
		eventClass: EventConstructor<T>,
		threadId: string,
		userId: string,
		timeoutMs: number,
		validator?: SessionValidator<T>,
		onCancel?: (reason: SessionError) => void,
	): Promise<T> {
		return this.waitForAny([eventClass], threadId, userId, timeoutMs, validator, onCancel);
	}

	public waitForAny<T extends SessionEvent>(
		eventClasses: Array<EventConstructor<T>>,
		threadId: string,
		userId: string,
		timeoutMs: number,
		validator?: SessionValidator<T>,
		onCancel?: (reason: SessionError) => void,
	): Promise<T> {
		const key = `${threadId}_${userId}`;

		this.cancelSession(threadId, userId);

		return new Promise<T>((resolve, reject) => {
			let isSettled = false;
			const unregisterListeners: Array<() => void> = [];

			const cleanup = () => {
				if (isSettled) return;
				isSettled = true;
				clearTimeout(timeout);
				for (const unregister of unregisterListeners) {
					unregister();
				}
				this.sessions.delete(key);
			};

			const timeout = setTimeout(() => {
				cleanup();
				const err = new SessionError('TIMEOUT');
				if (onCancel) onCancel(err);
				reject(err);
			}, timeoutMs);

			const handler = async (event: T) => {
				if (event.isCancelled) return;
				if (event.message.threadId !== threadId || event.message.data.uidFrom !== userId)
					return;

				let isValid = true;
				if (validator) {
					try {
						isValid = await validator(event);
					} catch (error) {
						cleanup();
						reject(error instanceof Error ? error : new Error(String(error)));
						return;
					}
				}

				if (isValid) {
					this.bot.logger.debug(
						`Event ${event.constructor.name} from ${event.message.data.uidFrom} routed to active session.`,
					);
					cleanup();
					resolve(event);
				}
			};

			for (const eventClass of eventClasses) {
				unregisterListeners.push(
					this.bot.eventManager.on(eventClass, handler, {
						priority: 10,
					}),
				);
			}

			this.sessions.set(key, {
				reject: (err: Error) => {
					cleanup();
					if (onCancel && err instanceof SessionError) onCancel(err);
					reject(err);
				},
				timeout,
			});
		});
	}

	public cancelSession(threadId: string, userId: string): void {
		const key = `${threadId}_${userId}`;
		const session = this.sessions.get(key);
		if (session) {
			session.reject(new SessionError('OVERRIDDEN'));
		}
	}

	public cancelSessionByUser(threadId: string, userId: string): boolean {
		const key = `${threadId}_${userId}`;
		const session = this.sessions.get(key);
		if (session) {
			session.reject(new SessionError('CANCELLED_BY_USER'));
			return true;
		}
		return false;
	}
}
