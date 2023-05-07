import { NrkApi } from '@/nrk/NrkApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _NrkParser extends ScrobbleParser {
	constructor() {
		super(NrkApi, { videoPlayerSelector: '.tv-series-video-player video' });
	}
}

export const NrkParser = new _NrkParser();
