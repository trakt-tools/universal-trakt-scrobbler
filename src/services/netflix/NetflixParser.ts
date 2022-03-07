import { NetflixApi } from '@/netflix/NetflixApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _NetflixParser extends ScrobbleParser {
	constructor() {
		super(NetflixApi, {
			watchingUrlRegex: /\/watch\/(?<id>\d+)/,
		});
	}
}

export const NetflixParser = new _NetflixParser();
