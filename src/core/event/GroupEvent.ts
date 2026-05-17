import { Event } from './Event';
import type { GroupEvent as ZcaGroupEvent } from 'zca-js';

export class GroupEvent extends Event {
	constructor(public readonly groupEvent: ZcaGroupEvent) {
		super();
	}
}
