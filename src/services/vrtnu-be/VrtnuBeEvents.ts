import { VrtnuBeParser } from '@/vrtnu-be/VrtnuBeParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _VrtnuBeEvents extends ScrobbleEvents {
	constructor() {
		super(VrtnuBeParser);
	}
}

export const VrtnuBeEvents = new _VrtnuBeEvents();
