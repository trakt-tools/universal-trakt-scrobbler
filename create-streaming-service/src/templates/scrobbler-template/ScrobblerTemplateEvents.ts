import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { ScrobblerTemplateParser } from './ScrobblerTemplateParser';

// Define any types you need here

/**
 * This class should watch for changes in the item that the user is watching.
 *
 * It is responsible for starting / pausing and stopping the scrobble, as well as updating the progress of the scrobble.
 *
 * Generally, you should not need to implement any methods here, as the super class should work out-of-the-box.
 */
class _ScrobblerTemplateEvents extends ScrobbleEvents {
	// Define any properties you need here

	constructor() {
		super(ScrobblerTemplateParser);
	}

	// Define any methods you need here
}

export const ScrobblerTemplateEvents = new _ScrobblerTemplateEvents();
