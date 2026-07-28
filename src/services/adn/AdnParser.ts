import { ScrobbleParser } from '@common/ScrobbleParser';
import { AdnApi } from '@/adn/AdnApi';

class _AdnParser extends ScrobbleParser {
	constructor() {
		super(AdnApi, {
			watchingUrlRegex: /\/video\/[\w-]+\/(?<id>\d+)/,
		});
	}
}

export const AdnParser = new _AdnParser();
