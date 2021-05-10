import { TraktSearch } from '../../api/TraktSearch';
import { TraktSync } from '../../api/TraktSync';
import { BrowserStorage, CorrectItem } from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { RequestException } from '../../common/Requests';
import { Item } from '../../models/Item';
import { TraktItem, TraktItemBase } from '../../models/TraktItem';
import { StreamingServiceId } from '../streaming-services';

export abstract class Api {
	id: StreamingServiceId;

	constructor(id: StreamingServiceId) {
		this.id = id;
	}

	static loadTraktHistory = async (items: Item[]) => {
		const missingItems = items.filter((item) => typeof item.trakt === 'undefined');
		if (missingItems.length === 0) {
			return;
		}
		try {
			const storage = await BrowserStorage.get(['correctItems', 'traktCache']);
			const { correctItems } = storage;
			let { traktCache } = storage;
			if (!traktCache) {
				traktCache = {};
			}
			const promises = [];
			for (const item of missingItems) {
				promises.push(
					Api.loadTraktItemHistory(item, traktCache, correctItems?.[item.serviceId]?.[item.id])
				);
			}
			await Promise.all(promises);
			await BrowserStorage.set({ traktCache }, false);
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load Trakt history.', err);
				await EventDispatcher.dispatch('TRAKT_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
		}
	};

	static loadTraktItemHistory = async (
		item: Item,
		traktCache: Record<string, TraktItemBase>,
		correctItem?: CorrectItem
	) => {
		if (item.trakt && !correctItem) {
			return;
		}
		try {
			const cacheId = Api.getTraktCacheId(item);
			const cacheItem = traktCache[cacheId];
			item.trakt =
				correctItem || !cacheItem
					? await TraktSearch.find(item, correctItem)
					: new TraktItem(cacheItem);
			await TraktSync.loadHistory(item);
			if (item.trakt) {
				traktCache[cacheId] = TraktItem.getBase(item.trakt);
			}
		} catch (err) {
			item.trakt = null;
		}
	};

	static getTraktCacheId = (item: Item): string => {
		return item.type === 'show'
			? `/shows/${Api.getTraktCacheStr(item.title)}/seasons/${item.season ?? 0}/episodes/${
					item.episode ?? Api.getTraktCacheStr(item.episodeTitle ?? '0')
			  }`
			: `/movies/${Api.getTraktCacheStr(item.title)}${item.year ? `-${item.year}` : ''}`;
	};

	static getTraktCacheStr = (title: string): string => {
		return title.toLowerCase().replace(/[^\w]/g, '-').replace(/-+/g, '-');
	};

	abstract loadHistory(itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<void>;
}
