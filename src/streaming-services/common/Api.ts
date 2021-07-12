import { TraktSearch } from '@api/TraktSearch';
import { TraktSync } from '@api/TraktSync';
import { BrowserStorage, CorrectItem } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { RequestException } from '@common/Requests';
import { getSyncStore } from '@common/SyncStore';
import { Item } from '@models/Item';
import { SavedTraktItem, TraktItem } from '@models/TraktItem';

const apis: Record<string, Api> = {};

export const registerApi = (id: string, api: Api) => {
	apis[id] = api;
};

export const getApi = (id: string) => {
	return apis[id];
};

export abstract class Api {
	readonly id: string;
	private leftoverHistoryItems: unknown[] = [];
	hasReachedHistoryEnd = false;

	constructor(id: string) {
		this.id = id;

		registerApi(this.id, this);
	}

	static async loadTraktHistory(items: Item[]) {
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
	}

	static async loadTraktItemHistory(
		item: Item,
		traktCache: Record<string, SavedTraktItem>,
		correctItem?: CorrectItem
	) {
		if (item.trakt && !correctItem) {
			return;
		}
		try {
			const cacheId = Api.getTraktCacheId(item);
			const cacheItem = traktCache[cacheId];
			item.trakt =
				correctItem || !cacheItem
					? await TraktSearch.find(item, correctItem)
					: TraktItem.load(cacheItem);
			if (item.trakt) {
				item.trakt.watchedAt = undefined;
				await TraktSync.loadHistory(item);
				traktCache[cacheId] = TraktItem.save(item.trakt);
			}
		} catch (err) {
			item.trakt = null;
		}
	}

	static async updateTraktHistory(items: Item[]) {
		try {
			const storage = await BrowserStorage.get('traktCache');
			let { traktCache } = storage;
			if (!traktCache) {
				traktCache = {};
			}
			const promises = [];
			for (const item of items) {
				promises.push(Api.updateTraktItemHistory(item, traktCache));
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
	}

	static async updateTraktItemHistory(item: Item, traktCache: Record<string, SavedTraktItem>) {
		if (!item.trakt) {
			return;
		}
		try {
			item.trakt.watchedAt = undefined;
			await TraktSync.loadHistory(item);
			const cacheId = Api.getTraktCacheId(item);
			traktCache[cacheId] = TraktItem.save(item.trakt);
		} catch (err) {
			item.trakt.watchedAt = undefined;
		}
	}

	static getTraktCacheId(item: Item): string {
		return item.type === 'show'
			? `/shows/${Api.getTraktCacheStr(item.title)}/seasons/${item.season ?? 0}/episodes/${
					item.episode ?? Api.getTraktCacheStr(item.episodeTitle ?? '0')
			  }`
			: `/movies/${Api.getTraktCacheStr(item.title)}${item.year ? `-${item.year}` : ''}`;
	}

	static getTraktCacheStr(title: string): string {
		return title.toLowerCase().replace(/[^\w]/g, '-').replace(/-+/g, '-');
	}

	async loadHistory(itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<void> {
		try {
			const store = getSyncStore(this.id);
			let { hasReachedEnd, hasReachedLastSyncDate } = store.data;
			let items: Item[] = [];
			const historyItems: unknown[] = [];
			do {
				let responseItems: unknown[] = [];
				if (this.leftoverHistoryItems.length > 0) {
					responseItems = this.leftoverHistoryItems;
					this.leftoverHistoryItems = [];
				} else if (!this.hasReachedHistoryEnd) {
					responseItems = await this.loadHistoryItems();
				}
				if (responseItems.length > 0) {
					let filteredItems: unknown[] = [];
					if (lastSync > 0 && lastSyncId) {
						for (const [index, responseItem] of responseItems.entries()) {
							if (this.isNewHistoryItem(responseItem, lastSync, lastSyncId)) {
								filteredItems.push(responseItem);
							} else {
								this.leftoverHistoryItems = responseItems.slice(index);
								hasReachedLastSyncDate = true;
								break;
							}
						}
					} else {
						filteredItems = responseItems;
					}
					itemsToLoad -= filteredItems.length;
					historyItems.push(...filteredItems);
				}
				hasReachedEnd = this.hasReachedHistoryEnd || hasReachedLastSyncDate;
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = await this.convertHistoryItems(historyItems);
			}
			store.setData({ items, hasReachedEnd, hasReachedLastSyncDate });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load history.', err);
				await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
	}

	/**
	 * This method is responsible for loading more history items. It should set `hasReachedHistoryEnd` to true when there are no more history items to load.
	 *
	 * Should be overridden in the child class.
	 */
	loadHistoryItems(): Promise<unknown[]> {
		return Promise.resolve([]);
	}

	/**
	 * This method is responsible for checking if a history item is new, based on `lastSync` and `lastSyncId`.
	 *
	 * Should be overridden in the child class.
	 */
	isNewHistoryItem(historyItem: unknown, lastSync: number, lastSyncId: string): boolean {
		return true;
	}

	/**
	 * This method is responsible for transforming history items into items.
	 *
	 * Should be overridden in the child class.
	 */
	convertHistoryItems(historyItems: unknown[]): Promisable<Item[]> {
		return Promise.resolve([]);
	}

	/**
	 * If an item can be retrieved from the API based on the ID, this method should be overridden in the child class.
	 */
	getItem(id: string): Promise<Item | null> {
		return Promise.resolve(null);
	}
}
