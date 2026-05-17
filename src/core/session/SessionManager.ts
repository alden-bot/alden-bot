import { MessageEvent } from '@/core/event/MessageEvent';
import type { AldenBot } from '@/core/AldenBot';

export class SessionError extends Error {
	constructor(public readonly code: 'TIMEOUT' | 'CANCELLED_BY_USER' | 'OVERRIDDEN') {
		super(`Session closed with code: ${code}`);
		this.name = 'SessionError';
	}
}

export type SessionValidator = (event: MessageEvent) => Promise<boolean> | boolean;

export class SessionManager {
	private readonly sessions = new Map<
		string,
		{
			resolve: (event: MessageEvent) => void;
			reject: (err: Error) => void;
			timeout: NodeJS.Timeout;
			validator?: SessionValidator;
		}
	>();

	public constructor(private readonly bot: AldenBot) {
		this.bot.eventManager.on(
			MessageEvent,
			async (event) => {
				if (event.isCancelled) return;

				const rawContent = event.message.data.content;
				const prefix = this.bot.config.PREFIX;
				const isCancelCmd =
					typeof rawContent === 'string' &&
					[`${prefix}cancel`, `${prefix}c`, `${prefix}stop`].includes(
						rawContent.trim().toLowerCase(),
					);

				if (isCancelCmd) return;

				const key = `${event.message.threadId}_${event.message.data.uidFrom}`;
				const session = this.sessions.get(key);
				if (!session) return;

				let isValid = true;
				if (session.validator) {
					try {
						isValid = await session.validator(event);
					} catch (error) {
						session.reject(error instanceof Error ? error : new Error(String(error)));
						this.sessions.delete(key);
						return;
					}
				}

				if (isValid) {
					this.bot.logger.debug(
						`Message from ${event.message.data.uidFrom} routed to active session.`,
					);
					clearTimeout(session.timeout);
					this.sessions.delete(key);
					session.resolve(event);
				}
			},
			{ priority: 10 },
		);
	}

	public waitForMessage(
		threadId: string,
		userId: string,
		timeoutMs: number,
		validator?: SessionValidator,
		onCancel?: (reason: SessionError) => void,
	): Promise<MessageEvent> {
		const key = `${threadId}_${userId}`;

		this.cancelSession(threadId, userId);

		const promise = new Promise<MessageEvent>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.sessions.delete(key);
				const err = new SessionError('TIMEOUT');
				if (onCancel) onCancel(err);
				reject(err);
			}, timeoutMs);

			this.sessions.set(key, {
				resolve,
				reject: (err: Error) => {
					if (onCancel && err instanceof SessionError) onCancel(err);
					reject(err);
				},
				timeout,
				validator,
			});
		});

		return promise;
	}

	public cancelSession(threadId: string, userId: string): void {
		const key = `${threadId}_${userId}`;
		const session = this.sessions.get(key);
		if (session) {
			clearTimeout(session.timeout);
			session.reject(new SessionError('OVERRIDDEN'));
			this.sessions.delete(key);
		}
	}

	public cancelSessionByUser(threadId: string, userId: string): boolean {
		const key = `${threadId}_${userId}`;
		const session = this.sessions.get(key);
		if (session) {
			clearTimeout(session.timeout);
			session.reject(new SessionError('CANCELLED_BY_USER'));
			this.sessions.delete(key);
			return true;
		}
		return false;
	}
}
