import { ViaplayParser } from '@/viaplay/ViaplayParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _ViaplayEvents extends ScrobbleEvents {
	constructor() {
		super(ViaplayParser);
	}
}

export const ViaplayEvents = new _ViaplayEvents();
