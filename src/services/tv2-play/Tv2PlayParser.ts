import { ScrobbleParser } from '@common/ScrobbleParser';
import { Tv2PlayApi } from '@/services/tv2-play/Tv2PlayApi';

class _Tv2PlayParser extends ScrobbleParser {
	constructor() {
		super(Tv2PlayApi, {
			watchingUrlRegex: /-(?!.*-)(?<id>.+)\.html/,
		});
	}
}

export const Tv2PlayParser = new _Tv2PlayParser();
