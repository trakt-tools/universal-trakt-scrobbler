import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { GoplayBeParser } from './GoplayBeParser';

class _GoplayBeEvents extends ScrobbleEvents {
	constructor() {
		super(GoplayBeParser);
	}
}

export const GoplayBeEvents = new _GoplayBeEvents();
