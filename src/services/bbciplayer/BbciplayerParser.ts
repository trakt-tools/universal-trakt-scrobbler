import { BbciplayerApi } from '@/bbciplayer/BbciplayerApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _BbciplayerParser extends ScrobbleParser {
	constructor() {
		super(BbciplayerApi, {
			watchingUrlRegex: /\/iplayer\/episode\/(?<id>b[0-9a-z]+)/,
		});
	}
}

export const BbciplayerParser = new _BbciplayerParser();
