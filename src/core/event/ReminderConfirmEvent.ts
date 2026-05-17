import type { Message } from 'zca-js';

import type { ReminderConfirmData } from '@/parser/contentParser';

import { Event } from './Event';

export class ReminderConfirmEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly reminder: ReminderConfirmData,
	) {
		super();
	}
}
