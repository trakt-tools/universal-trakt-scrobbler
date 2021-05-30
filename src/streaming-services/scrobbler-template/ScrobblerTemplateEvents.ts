import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';

// Define any types you need here.

// This class should watch for changes in the item that the user is watching. It is responsible for starting / pausing and stopping the scrobble, as well as updating the progress of the scrobble.
class _ScrobblerTemplateEvents extends ScrobbleEvents {
	// Define any properties you need here.

	// This method checks for changes every half second (by default) and triggers the appropriate methods.
	async checkForChanges(): Promise<void> {
		// To start the scrobble.
		await this.start();

		// To pause the scrobble.
		await this.pause();

		// To stop the scrobble.
		await this.stop();

		// To update the progress of the scrobble.
		await this.updateProgress(newProgress);

		// Do not change this line of code, unless you want to change the check frequency from a half second to something else. Assigning the timeout ID to the 'changeListenerId' property here is very important.
		this.changeListenerId = window.setTimeout(() => void this.checkForChanges(), 500);
	}

	// Define any methods you need here.
}

export const ScrobblerTemplateEvents = new _ScrobblerTemplateEvents();

registerScrobbleEvents('scrobbler-template', ScrobblerTemplateEvents);
