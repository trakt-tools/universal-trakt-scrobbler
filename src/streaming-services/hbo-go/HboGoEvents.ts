import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { HboGoParser } from './HboGoParser';

class _HboGoEvents extends ScrobbleEvents {
	constructor() {
		super(HboGoParser);
	}
}

export const HboGoEvents = new _HboGoEvents();
