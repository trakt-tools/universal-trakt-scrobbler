import { HboMaxApi } from '@/hbo-max/HboMaxApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _HboMaxParser extends ScrobbleParser {
	constructor() {
		super(HboMaxApi, {
			/**
			 * Formats:
			 *
			 * - Episode: https://play.hbomax.com/episode/urn:hbo:episode:XXXXXXXXXXXXXXXXXXXX
			 * - Movie: https://play.hbomax.com/feature/urn:hbo:feature:XXXXXXXXXXXXXXXXXXXX
			 */
			watchingUrlRegex: /\/(?:episode|feature)\/(?<id>.+)/,
		});
	}
}

export const HboMaxParser = new _HboMaxParser();
