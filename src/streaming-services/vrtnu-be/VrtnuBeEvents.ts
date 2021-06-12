import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { VrtnuBeParser } from './VrtnuBeParser';

class _VrtnuBeEvents extends ScrobbleEvents {
	constructor() {
		super(VrtnuBeParser);
	}
}

export const VrtnuBeEvents = new _VrtnuBeEvents();
