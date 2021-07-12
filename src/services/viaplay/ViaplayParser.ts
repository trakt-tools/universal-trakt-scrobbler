import { ViaplayApi } from '@/viaplay/ViaplayApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _ViaplayParser extends ScrobbleParser {
	constructor() {
		super(ViaplayApi, {
			watchingUrlRegex: /\/player\/default\/(.+)/, // https://viaplay.no/player/default/serier/mr.-robot/sesong-4/episode-1 => serier/mr.-robot/sesong-4/episode-1
		});
	}
}

export const ViaplayParser = new _ViaplayParser();
