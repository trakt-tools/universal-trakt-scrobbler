import { MaxApi } from '@/max/MaxApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _MaxParser extends ScrobbleParser {
	constructor() {
		super(MaxApi, {
			/**
			 * Format: https://play.max.com/player/urn:hbo:episode:XXXXXXXXXXXXXXXXXXXX
			 */
			watchingUrlRegex: /\/(?:player)\/(?<id>[^/]+)/,
		});
	}
}

export const MaxParser = new _MaxParser();
