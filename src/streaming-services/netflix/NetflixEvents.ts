import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { NetflixParser } from './NetflixParser';

class _NetflixEvents extends ScrobbleEvents {
	constructor() {
		super(NetflixParser);
	}
}

export const NetflixEvents = new _NetflixEvents();

registerScrobbleEvents('netflix', NetflixEvents);
