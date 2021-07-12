import { HboGoParser } from '@/hbo-go/HboGoParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _HboGoEvents extends ScrobbleEvents {
	constructor() {
		super(HboGoParser);
	}
}

export const HboGoEvents = new _HboGoEvents();
