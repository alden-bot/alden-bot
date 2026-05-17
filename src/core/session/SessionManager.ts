import { Event } from '@/core/event/Event';
import type { EventConstructor } from '@/core/event/EventManager';
import type { AldenBot } from '@/core/AldenBot';

export class SessionError extends Error {
	constructor(public readonly code: 'TIMEOUT' | 'CANCELLED_BY_USER' | 'OVERRIDDEN') {
		super(`Session closed with code: ${code}`);
		this.name = 'SessionError';
	}
}

export type SessionValidator<T extends Event> = (event: T) => Promise<boolean> | boolean;

export class SessionManager {
	private readonly sessions = new Map<
		string,
		{
			reject: (err: Error) => void;
			timeout: NodeJS.Timeout;
		}
	>();

	public constructor(private readonly bot: AldenBot) {}

	public waitFor<
		T extends Event & {
			message: { threadId: string; data: { uidFrom: string }; type: number };
		},
	>(
		eventClass: EventConstructor<T>,
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

			const cleanup = () => {
				if (isSettled) return;
				isSettled = true;
				clearTimeout(timeout);
				unregister();
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
						`Event ${eventClass.name} from ${event.message.data.uidFrom} routed to active session.`,
					);
					cleanup();
					resolve(event);
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const unregister = this.bot.eventManager.on(eventClass, handler as any, {
				priority: 10,
			});

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
