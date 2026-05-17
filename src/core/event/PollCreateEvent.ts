import type { Message } from 'zca-js';

import type { PollCreateData } from '@/parser/contentParser';

import { Event } from './Event';

export class PollCreateEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly poll: PollCreateData,
	) {
		super();
	}
}
