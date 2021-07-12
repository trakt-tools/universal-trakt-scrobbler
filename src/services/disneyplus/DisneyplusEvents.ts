import { DisneyplusParser } from '@/disneyplus/DisneyplusParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _DisneyplusEvents extends ScrobbleEvents {
	constructor() {
		super(DisneyplusParser);
	}
}

export const DisneyplusEvents = new _DisneyplusEvents();
