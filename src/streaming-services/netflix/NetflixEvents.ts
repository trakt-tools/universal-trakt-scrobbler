import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { NetflixParser } from './NetflixParser';

class _NetflixEvents extends ScrobbleEvents {
	constructor() {
		super(NetflixParser);
	}
}

export const NetflixEvents = new _NetflixEvents();
