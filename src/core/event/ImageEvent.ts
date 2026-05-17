import type { Message } from 'zca-js';

import type { ImageData } from '@/parser/contentParser';

import { Event } from './Event';

export class ImageEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly image: ImageData,
	) {
		super();
	}
}
