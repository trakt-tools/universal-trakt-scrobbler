import { AmcPlusApi } from '@/amc-plus/AmcPlusApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _AmcPlusParser extends ScrobbleParser {
	constructor() {
		super(AmcPlusApi, {
			/**
			 * Example Formats:
			 *
			 * - Episodes: https://www.amcplus.com/shows/the-walking-dead/episodes--1027559
			 * - Movies: https://www.amcplus.com/watch/movies/halloween--1027962
			 */
			watchingUrlRegex: /\/(?<episodeId>shows\/.+?\/episodes\/.+)|\/watch\/(?<movieId>movies\/.+)/,
		});
	}
}

export const AmcPlusParser = new _AmcPlusParser();
