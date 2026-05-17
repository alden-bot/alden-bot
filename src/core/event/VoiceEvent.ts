import type { Message } from 'zca-js';

import type { VoiceData } from '@/parser/contentParser';

import { Event } from './Event';

export class VoiceEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly voice: VoiceData,
	) {
		super();
	}
}
