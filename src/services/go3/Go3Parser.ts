import { ScrobbleParser } from '@common/ScrobbleParser';
import { Go3Api } from '@/go3/Go3Api';

class _Go3Parser extends ScrobbleParser {
	constructor() {
		super(Go3Api, {
			/**
			 * Example Formats:
			 *
			 * - Episodes: https://go3.lv/watch/serija-1,episode-4903985
			 * - Movies: https://go3.lv/watch/grincs,vod-1023230
			 */

			watchingUrlRegex: /\/watch\/[^,]*,(?:episode|vod)-(?<id>\d+)/,
		});
	}
}

export const Go3Parser = new _Go3Parser();
