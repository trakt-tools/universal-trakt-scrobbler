import { Suggestion } from '@apis/CorrectionApi';
import { TraktSearch } from '@apis/TraktSearch';
import { TraktSync } from '@apis/TraktSync';
import { BrowserStorage } from '@common/BrowserStorage';
import { Cache, CacheItems } from '@common/Cache';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { RequestException } from '@common/Requests';
import { Item } from '@models/Item';
import { getSyncStore } from '@stores/SyncStore';

const serviceApis = new Map<string, ServiceApi>();

export const registerServiceApi = (id: string, api: ServiceApi) => {
	serviceApis.set(id, api);
};

export const getServiceApi = (id: string) => {
	const api = serviceApis.get(id);
	if (!api) {
		throw new Error(`API not registered for ${id}`);
	}
	return api;
};

export abstract class ServiceApi {
	readonly id: string;
	private leftoverHistoryItems: unknown[] = [];
	hasReachedHistoryEnd = false;

	constructor(id: string) {
		this.id = id;

		registerServiceApi(this.id, this);
	}

	static async loadTraktHistory(items: Item[]) {
		const missingItems = items.filter(
			(item) =>
				typeof item.trakt === 'undefined' ||
				(item.trakt && typeof item.trakt.watchedAt === 'undefined')
		);
		if (missingItems.length === 0) {
			return;
		}
		try {
			const caches = await Cache.get([
				'itemsToTraktItems',
				'traktItems',
				'traktHistoryItems',
				'urlsToTraktItems',
			]);
			const { corrections } = await BrowserStorage.get('corrections');
			for (const item of missingItems) {
				const databaseId = item.getDatabaseId();
				const correction = corrections?.[databaseId];
				await ServiceApi.loadTraktItemHistory(item, caches, correction);
			}
			await Cache.set(caches);
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
		caches: CacheItems<
			['itemsToTraktItems', 'traktItems', 'traktHistoryItems', 'urlsToTraktItems']
		>,
		correction?: Suggestion
	) {
		try {
			if (!item.trakt) {
				item.trakt = await TraktSearch.find(item, caches, correction);
			}
			if (item.trakt && typeof item.trakt.watchedAt === 'undefined') {
				await TraktSync.loadHistory(item, caches.traktHistoryItems);
			}
		} catch (err) {
			if (item.trakt) {
				delete item.trakt.watchedAt;
			}
		}
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
				await EventDispatcher.dispatch('SERVICE_HISTORY_LOAD_ERROR', null, {
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
