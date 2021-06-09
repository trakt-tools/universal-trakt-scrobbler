import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { DisneyplusParser } from './DisneyplusParser';

class _DisneyplusEvents extends ScrobbleEvents {
	constructor() {
		super(DisneyplusParser);
	}
}

export const DisneyplusEvents = new _DisneyplusEvents();
