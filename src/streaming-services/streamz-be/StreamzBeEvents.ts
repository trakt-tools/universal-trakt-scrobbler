import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { StreamzBeParser } from './StreamzBeParser';

class _StreamzBeEvents extends ScrobbleEvents {
	constructor() {
		super(StreamzBeParser);
	}
}

export const StreamzBeEvents = new _StreamzBeEvents();
