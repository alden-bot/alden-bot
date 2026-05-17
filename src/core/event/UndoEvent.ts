import { Event } from './Event';
import type { Undo } from 'zca-js';

export class UndoEvent extends Event {
	constructor(public readonly undo: Undo) {
		super();
	}
}
