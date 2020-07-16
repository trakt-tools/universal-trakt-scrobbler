import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { ISyncItem } from '../../../../models/SyncItem';
import { BrowserStorage } from '../../../../services/BrowserStorage';
import { Errors } from '../../../../services/Errors';
import { EventDispatcher, Events } from '../../../../services/Events';
import { StreamingServiceId } from '../../../../streaming-services';
import { getStore } from './common';

export abstract class Api {
	id: StreamingServiceId;

	constructor(id: StreamingServiceId) {
		this.id = id;
	}

	abstract loadHistory(
		nextPage: number,
		nextVisualPage: number,
		itemsToLoad: number
	): Promise<void>;

	loadTraktHistory = async () => {
		try {
			const storage = await BrowserStorage.get(['correctUrls', 'traktCache']);
			const { correctUrls } = storage;
			let { traktCache } = storage;
			if (!traktCache) {
				traktCache = {};
			}
			const promises = [];
			const items = getStore(this.id).data.items;
			for (const item of items) {
				promises.push(this.loadTraktItemHistory(item, traktCache, correctUrls?.[this.id][item.id]));
			}
			await Promise.all(promises);
			await BrowserStorage.set({ traktCache }, false);
			await getStore(this.id).update();
		} catch (err) {
			Errors.error('Failed to load Trakt history.', err);
			await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, null, {
				error: err as Error,
			});
		}
	};

	loadTraktItemHistory = async (
		item: Item,
		traktCache: Record<string, Omit<ISyncItem, 'watchedAt'>>,
		url?: string
	) => {
		if (item.trakt && !url) {
			return;
		}
		try {
			const cacheId = this.getTraktCacheId(item);
			const cacheItem = traktCache[cacheId];
			item.trakt = url || !cacheItem ? await TraktSearch.find(item, url) : cacheItem;
			await TraktSync.loadHistory(item);
			if (item.trakt) {
				const { watchedAt, ...cacheItem } = item.trakt;
				traktCache[cacheId] = cacheItem;
			}
		} catch (err) {
			item.trakt = {
				notFound: true,
			};
		}
	};

	getTraktCacheId = (item: Item): string => {
		return item.type === 'show'
			? `/shows/${this.getTraktCacheStr(item.title)}/seasons/${item.season ?? 0}/episodes/${
					item.episode ?? this.getTraktCacheStr(item.episodeTitle ?? '0')
			  }`
			: `/movies/${this.getTraktCacheStr(item.title)}${item.year ? `-${item.year}` : ''}`;
	};

	getTraktCacheStr = (title: string): string => {
		return title.toLowerCase().replace(/[^\w]/g, '-').replace(/-+/g, '-');
	};
}
