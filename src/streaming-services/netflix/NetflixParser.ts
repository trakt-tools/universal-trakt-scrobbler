import { ScrobbleParser } from '../common/ScrobbleParser';
import { NetflixApi } from './NetflixApi';

class _NetflixParser extends ScrobbleParser {
	constructor() {
		super(NetflixApi, {
			watchingUrlRegex: /\/watch\/(\d+)/,
		});
	}
}

export const NetflixParser = new _NetflixParser();
