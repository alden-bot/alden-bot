import type { Event } from './Event';
import logger from '@/shared/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventConstructor<T extends Event> = new (...args: any[]) => T;
export type EventHandler<T extends Event> = (event: T) => void | Promise<void>;

interface HandlerEntry {
	handler: EventHandler<Event>;
	priority: number;
	ignoreCancelled: boolean;
}

export interface EventListenerOptions {
	priority?: number;
	ignoreCancelled?: boolean;
}

export class EventManager {
	private readonly handlers = new Map<string, HandlerEntry[]>();
	private readonly allHandlers: HandlerEntry[] = [];

	public on<T extends Event>(
		eventClass: EventConstructor<T>,
		handler: EventHandler<T>,
		options: EventListenerOptions | number = {},
	): () => void {
		const entry = this.createEntry(handler, options);

		const key = eventClass.name;
		const existing = this.handlers.get(key) ?? [];
		existing.push(entry);
		existing.sort((a, b) => a.priority - b.priority);
		this.handlers.set(key, existing);

		return () => this.off(key, entry);
	}

	public onAll<T extends Event>(
		handler: EventHandler<T>,
		options: EventListenerOptions | number = {},
	): () => void {
		const entry = this.createEntry(handler, options);
		this.allHandlers.push(entry);
		this.allHandlers.sort((a, b) => a.priority - b.priority);

		return () => this.offAll(entry);
	}

	private createEntry<T extends Event>(
		handler: EventHandler<T>,
		options: EventListenerOptions | number,
	): HandlerEntry {
		const opts: EventListenerOptions =
			typeof options === 'number' ? { priority: options } : options;

		return {
			handler: handler as EventHandler<Event>,
			priority: opts.priority ?? 0,
			ignoreCancelled: opts.ignoreCancelled ?? false,
		};
	}

	private off(key: string, entry: HandlerEntry): void {
		const entries = this.handlers.get(key);
		if (!entries) return;

		const idx = entries.indexOf(entry);
		if (idx !== -1) entries.splice(idx, 1);
		if (entries.length === 0) this.handlers.delete(key);
	}

	private offAll(entry: HandlerEntry): void {
		const idx = this.allHandlers.indexOf(entry);
		if (idx !== -1) this.allHandlers.splice(idx, 1);
	}

	public async call<T extends Event>(event: T): Promise<T> {
		const entries = this.handlers.get(event.constructor.name) ?? [];
		const snapshot = [...this.allHandlers, ...entries].sort((a, b) => a.priority - b.priority);
		for (let i = 0; i < snapshot.length; i++) {
			const { handler, priority, ignoreCancelled } = snapshot[i]!;
			if (event.isCancelled && !ignoreCancelled) continue;
			try {
				await handler(event);
			} catch (error) {
				logger.error(
					`[EventManager] Handler #${i} (priority ${priority}) threw while processing ${event.constructor.name}:`,
					error,
				);
			}
		}
		return event;
	}
}
