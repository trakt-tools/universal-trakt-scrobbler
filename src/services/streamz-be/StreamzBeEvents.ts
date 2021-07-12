import { StreamzBeParser } from '@/streamz-be/StreamzBeParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _StreamzBeEvents extends ScrobbleEvents {
	constructor() {
		super(StreamzBeParser);
	}
}

export const StreamzBeEvents = new _StreamzBeEvents();
