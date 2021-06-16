import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { ViaplayParser } from './ViaplayParser';

class _ViaplayEvents extends ScrobbleEvents {
	constructor() {
		super(ViaplayParser);
	}
}

export const ViaplayEvents = new _ViaplayEvents();
