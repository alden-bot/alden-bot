import type { Message } from 'zca-js';

import type { FileData } from '@/parser/contentParser';

import { Event } from './Event';

export class FileEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly file: FileData,
	) {
		super();
	}
}
