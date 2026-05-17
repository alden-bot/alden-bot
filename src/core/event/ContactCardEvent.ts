import type { Message } from 'zca-js';

import type { ContactCardData } from '@/parser/contentParser';

import { Event } from './Event';

export class ContactCardEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly contact: ContactCardData,
	) {
		super();
	}
}
