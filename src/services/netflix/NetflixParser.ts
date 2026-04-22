import { NetflixApi } from '@/netflix/NetflixApi';
import { ScrobbleParser } from '@common/ScrobbleParser';

class _NetflixParser extends ScrobbleParser {
	constructor() {
		super(NetflixApi, {
			watchingUrlRegex: /\/watch\/(?<id>\d+)/,
		});
	}

	protected async parseItemId(): Promise<string | null> {
		const id = await this.parseItemIdFromInjectedScript();
		if (id) {
			return id;
		}
		return super.parseItemId();
	}

	protected async parseItemFromApi() {
		const id = await this.parseItemId();
		return id ? this.api.getItem(id) : null;
	}
}

export const NetflixParser = new _NetflixParser();
