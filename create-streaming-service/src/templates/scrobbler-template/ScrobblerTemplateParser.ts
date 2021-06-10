import { ScrobbleParser } from '../common/ScrobbleParser';
import { ScrobblerTemplateApi } from './ScrobblerTemplateApi';

// Define any types you need here

/**
 * This class should parse information about what the user is watching.
 */
class _ScrobblerTemplateParser extends ScrobbleParser {
	// Define any properties you need here

	constructor() {
		super(ScrobblerTemplateApi, {
			videoPlayerSelector: 'video', // This is the default option, so it doesn't need to be specified
			watchingUrlRegex: /\/watch\/(.+)/, // https://streamingservice.com/watch/ABC123 => ABC123
		});
	}

	/**
	 * Verify if the following are true for the streaming service:
	 *
	 *   - the streaming service offers an API endpoint for retrieving information about an item using an ID;
	 *   - the item is played through an HTMLVideoElement;
	 *   - the item ID is available in the URL.
	 *
	 * If all of the above are true, all you need to do to get the scrobbler to work is:
	 *
	 *   - make sure that `getItem` is implemented in the `Api` class passed to the constructor above;
	 *   - make sure that `videoPlayerSelector` correctly selects the HTMLVideoElement through the options passed to the constructor above;
	 *   - make sure that `watchingUrlRegex` correctly extracts the item ID through the options passed to the constructor above.
	 *
	 * And that's it! The generic methods will take care of the rest. Netflix is an example of streaming service that applies to the above, so you can check out its implementation to see how simple it is.
	 *
	 * However, if all of the above aren't true, or only some of them are, you'll have to implement/override methods from the super class to get the scrobbler to work.
	 *
	 * For each type of information (playback, item, item ID), you have three options to implement/override:
	 *
	 *   - `*FnToInject()`: if the information can be parsed from an injected script (accessing the `window` object);
	 *   - `parse*FromDom()`: if the information can be parsed from the DOM (accessing the `document` object);
	 *   - `parse*FromCustom()`: if the information has to be parsed another way not covered by the other methods.
	 *
	 * Only one of them is required, but if you implement more than one, they will be used as fallback.
	 *
	 * An example of application for custom methods is when the only way to parse information is to do so when the user clicks on the play button. In that scenario, `onClick` should be implemented.
	 */

	// Define any methods you need here
}

export const ScrobblerTemplateParser = new _ScrobblerTemplateParser();
