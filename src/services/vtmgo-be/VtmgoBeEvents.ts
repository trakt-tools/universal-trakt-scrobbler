import { VtmgoBeParser } from '@/vtmgo-be/VtmgoBeParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _VtmgoBeEvents extends ScrobbleEvents {
	constructor() {
		super(VtmgoBeParser);
	}
}

export const VtmgoBeEvents = new _VtmgoBeEvents();
