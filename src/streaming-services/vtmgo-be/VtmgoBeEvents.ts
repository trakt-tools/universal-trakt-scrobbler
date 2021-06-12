import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { VtmgoBeParser } from './VtmgoBeParser';

class _VtmgoBeEvents extends ScrobbleEvents {
	constructor() {
		super(VtmgoBeParser);
	}
}

export const VtmgoBeEvents = new _VtmgoBeEvents();
