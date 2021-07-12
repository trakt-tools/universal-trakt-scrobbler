import { NetflixParser } from '@/netflix/NetflixParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _NetflixEvents extends ScrobbleEvents {
	constructor() {
		super(NetflixParser);
	}
}

export const NetflixEvents = new _NetflixEvents();
