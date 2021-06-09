import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { NrkParser } from './NrkParser';

class _NrkEvents extends ScrobbleEvents {
	constructor() {
		super(NrkParser);
	}
}

export const NrkEvents = new _NrkEvents();
