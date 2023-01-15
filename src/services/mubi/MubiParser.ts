import { ScrobbleParser } from '@common/ScrobbleParser';
import { MubiApi } from '@/mubi/MubiApi';

class _MubiParser extends ScrobbleParser {
	constructor() {
		super(MubiApi, {
			videoPlayerSelector: 'video',
			watchingUrlRegex: /\/films\/(?<id>.+)\/player/,
		});
	}
}

export const MubiParser = new _MubiParser();
