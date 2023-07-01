import { ScrobbleParser } from '@common/ScrobbleParser';
import { SkyshowtimeApi } from '@/skyshowtime/SkyshowtimeApi';

class _SkyshowtimeParser extends ScrobbleParser {
	constructor() {
		super(SkyshowtimeApi, {
			watchingUrlRegex: /\/watch\/playback\/vod\/(?<id>.+)\/.*/, // https://www.skyshowtime.com/watch/playback/vod/SkyShowtime:GMO_xxxxxxxxxxxxxx_xx/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
		});
	}
}

export const SkyshowtimeParser = new _SkyshowtimeParser();
