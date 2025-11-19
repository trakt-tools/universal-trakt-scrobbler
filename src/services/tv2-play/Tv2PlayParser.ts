import { ScrobbleParser } from '@common/ScrobbleParser';
import { Tv2PlayApi } from '@/services/tv2-play/Tv2PlayApi';

class _Tv2PlayParser extends ScrobbleParser {
	constructor() {
		super(Tv2PlayApi, {
			// Match URLs like: /serier/spillet-zw9172j4/sesong-2/episode-10 or /film/den-der-lever-stille-3kmxmbkv
			// Capture the entire path after play.tv2.no as the ID
			watchingUrlRegex: /play\.tv2\.no(?<id>\/(?:serier|film)\/[^?#]+)/,
		});
	}
}

export const Tv2PlayParser = new _Tv2PlayParser();
