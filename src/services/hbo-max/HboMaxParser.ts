import { HboMaxApi } from '@/hbo-max/HboMaxApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _HboMaxParser extends ScrobbleParser {
	constructor() {
		super(HboMaxApi, {
			/**
			 * Format: https://play.hbomax.com/player/urn:hbo:episode:XXXXXXXXXXXXXXXXXXXX
			 */
			watchingUrlRegex: /\/(?:player)\/(?<id>[^/]+)/,
		});
	}
}

export const HboMaxParser = new _HboMaxParser();
