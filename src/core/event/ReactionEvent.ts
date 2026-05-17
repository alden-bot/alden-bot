import { Event } from './Event';
import type { Reaction } from 'zca-js';

export class ReactionEvent extends Event {
	constructor(public readonly reaction: Reaction) {
		super();
	}
}
