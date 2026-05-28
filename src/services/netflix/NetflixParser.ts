import { NetflixApi, NetflixInjectedPlayback } from '@/netflix/NetflixApi';
import { ScriptInjector } from '@common/ScriptInjector';
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

	protected async parseItemIdFromInjectedScript(): Promise<string | null> {
		const playback = await ScriptInjector.inject<NetflixInjectedPlayback>(
			this.api.id,
			'playback',
			''
		);
		return playback?.videoId ?? null;
	}

	protected async parseItemFromApi() {
		const id = await this.parseItemId();
		return id ? this.api.getItem(id) : null;
	}
}

export const NetflixParser = new _NetflixParser();
