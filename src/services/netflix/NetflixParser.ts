import { NetflixApi, NetflixInjectedPlayback } from '@/netflix/NetflixApi';
import { ScriptInjector } from '@common/ScriptInjector';
import { ScrobblePlayback, ScrobbleParser } from '@common/ScrobbleParser';
import { ScrobbleItem } from '@models/Item';

class _NetflixParser extends ScrobbleParser {
	/**
	 * How long (in ms) to wait before retrying `getItem` for an ID that failed to resolve.
	 *
	 * Netflix live content isn't always available in the metadata API right away, so unlike
	 * the base parser - which blacklists a failing ID for the rest of the session - we keep
	 * retrying so the item can resolve once it becomes available. The retry is throttled to
	 * avoid hammering the API on every parse tick (which runs roughly every 500ms).
	 */
	private static readonly FAILING_ID_RETRY_INTERVAL = 30 * 1e3;

	/**
	 * How long (in ms) a single playback injection is reused for. Both the playback and the
	 * item ID are derived from the same injected function, so caching it for a short window
	 * collapses the multiple injections that happen within a single parse cycle into one,
	 * while still refreshing on the next tick.
	 */
	private static readonly PLAYBACK_CACHE_TTL = 250;

	private failingIds = new Map<string, number>();
	private cachedPlayback: NetflixInjectedPlayback | null = null;
	private cachedPlaybackAt = 0;

	constructor() {
		super(NetflixApi, {
			watchingUrlRegex: /\/watch\/(?<id>\d+)/,
		});
	}

	protected async parsePlaybackFromInjectedScript(): Promise<Partial<ScrobblePlayback> | null> {
		return this.getInjectedPlayback();
	}

	protected async parseItemId(): Promise<string | null> {
		const id = await this.parseItemIdFromInjectedScript();
		if (id) {
			return id;
		}
		return super.parseItemId();
	}

	protected async parseItemIdFromInjectedScript(): Promise<string | null> {
		const playback = await this.getInjectedPlayback();
		return playback?.videoId ?? null;
	}

	protected async parseItemFromApi(): Promise<ScrobbleItem | null> {
		const id = await this.parseItemId();
		if (!id) {
			return null;
		}

		// Throttle retries for IDs that recently failed to resolve, so an unresolvable ID
		// doesn't trigger a fresh round of API requests on every parse tick.
		const lastFailedAt = this.failingIds.get(id);
		if (
			typeof lastFailedAt !== 'undefined' &&
			Date.now() - lastFailedAt < _NetflixParser.FAILING_ID_RETRY_INTERVAL
		) {
			return null;
		}

		const item = await this.api.getItem(id);
		if (item) {
			this.failingIds.delete(id);
		} else {
			this.failingIds.set(id, Date.now());
		}
		return item;
	}

	private async getInjectedPlayback(): Promise<NetflixInjectedPlayback | null> {
		const now = Date.now();
		if (this.cachedPlayback && now - this.cachedPlaybackAt < _NetflixParser.PLAYBACK_CACHE_TTL) {
			return this.cachedPlayback;
		}

		const playback = await ScriptInjector.inject<NetflixInjectedPlayback>(
			this.api.id,
			'playback',
			''
		);
		this.cachedPlayback = playback;
		this.cachedPlaybackAt = now;
		return playback;
	}
}

export const NetflixParser = new _NetflixParser();
