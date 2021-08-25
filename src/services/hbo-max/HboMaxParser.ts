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
			watchingUrlRegex: /\/episode\/(.+)|\/feature\/(.+)/,
		});
	}

	protected parseItemIdFromUrl() {
		const hboMaxId = super.parseItemIdFromUrl();
		const id = hboMaxId ? HboMaxApi.convertHboMaxId(hboMaxId) : null;
		return id;
	}
}

export const HboMaxParser = new _HboMaxParser();
