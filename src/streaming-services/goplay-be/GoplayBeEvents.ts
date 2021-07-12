import { GoplayBeParser } from '@/goplay-be/GoplayBeParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _GoplayBeEvents extends ScrobbleEvents {
	constructor() {
		super(GoplayBeParser);
	}
}

export const GoplayBeEvents = new _GoplayBeEvents();
