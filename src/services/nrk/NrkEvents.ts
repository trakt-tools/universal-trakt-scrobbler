import { NrkParser } from '@/nrk/NrkParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _NrkEvents extends ScrobbleEvents {
	constructor() {
		super(NrkParser);
	}
}

export const NrkEvents = new _NrkEvents();
