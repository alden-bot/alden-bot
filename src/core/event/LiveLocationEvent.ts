import type { Message } from 'zca-js';

import type { LiveLocationData } from '@/parser/contentParser';

import { Event } from './Event';

export class LiveLocationEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly location: LiveLocationData,
	) {
		super();
	}
}
