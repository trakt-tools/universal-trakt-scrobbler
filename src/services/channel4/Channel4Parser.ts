import { Channel4Api } from '@/channel4/Channel4Api';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _Channel4Parser extends ScrobbleParser {
	constructor() {
		super(Channel4Api, {
			watchingUrlRegex: /programmes\/(?<brand>[\w-]+)\/on-demand\/(?<id>[\w-]+)/,
		});
	}
}

export const Channel4Parser = new _Channel4Parser();
