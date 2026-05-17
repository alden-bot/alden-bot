import type { Message } from 'zca-js';

import type { LocationData } from '@/parser/contentParser';

import { Event } from './Event';

export class LocationEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly location: LocationData,
	) {
		super();
	}
}
