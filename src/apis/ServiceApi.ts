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

export interface ServiceApiSession {
	profileName: string | null;
}

export abstract class ServiceApi {
	readonly id: string;
	private leftoverHistoryItems: unknown[] = [];
	hasReachedHistoryEnd = false;
	session: ServiceApiSession | null = null;

	constructor(id: string) {
		this.id = id;

		registerServiceApi(this.id, this);
	}

	static async loadTraktHistory(items: Item[], processItem?: (item: Item) => Promise<Item>) {
		const hasLoadedTraktHistory = !items.some(
			(item) =>
				typeof item.trakt === 'undefined' ||
				(item.trakt && typeof item.trakt.watchedAt === 'undefined')
		);
		if (hasLoadedTraktHistory) {
			return items;
		}
		let newItems = items.map((item) => item.clone());
		try {
			const caches = await Cache.get([
				'itemsToTraktItems',
				'traktItems',
				'traktHistoryItems',
				'urlsToTraktItems',
			]);
			const { corrections } = await BrowserStorage.get('corrections');
			const promises = [];
			for (const item of newItems) {
				if (
					typeof item.trakt === 'undefined' ||
					(item.trakt && typeof item.trakt.watchedAt === 'undefined')
				) {
					const databaseId = item.getDatabaseId();
					const correction = corrections?.[databaseId];
					promises.push(ServiceApi.loadTraktItemHistory(item, caches, correction, processItem));
				} else {
					promises.push(Promise.resolve(item));
				}
			}
			newItems = await Promise.all(promises);
			await Cache.set(caches);
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load Trakt history.', err);
				await EventDispatcher.dispatch('TRAKT_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
		}
		return newItems;
	}

	static async loadTraktItemHistory(
		item: Item,
		caches: CacheItems<
			['itemsToTraktItems', 'traktItems', 'traktHistoryItems', 'urlsToTraktItems']
		>,
		correction?: Suggestion,
		processItem?: (item: Item) => Promise<Item>
	) {
		try {
			if (!item.trakt) {
				item.trakt = await TraktSearch.find(item, caches, correction);
				if (processItem) {
					item = await processItem(item.clone());
				}
			}
			if (item.trakt && typeof item.trakt.watchedAt === 'undefined') {
				await TraktSync.loadHistory(item, caches.traktHistoryItems);
				if (processItem) {
					item = await processItem(item.clone());
				}
			}
		} catch (err) {
			if (item.trakt) {
				delete item.trakt.watchedAt;
			}
		}
		return item;
	}

	checkLogin(): Promise<boolean> {
		return Promise.resolve(!!this.session && this.session.profileName !== null);
	}

	async loadHistory(itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<Item[]> {
		let items: Item[] = [];
		try {
			const store = getSyncStore(this.id);
			let { hasReachedEnd, hasReachedLastSyncDate } = store.data;
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
					if (lastSync > 0 && lastSyncId) {
						for (const [index, responseItem] of responseItems.entries()) {
							if (itemsToLoad === 0) {
								this.leftoverHistoryItems = responseItems.slice(index);
								break;
							} else if (this.isNewHistoryItem(responseItem, lastSync, lastSyncId)) {
								historyItems.push(responseItem);
								itemsToLoad -= 1;
							} else {
								this.leftoverHistoryItems = responseItems.slice(index);
								hasReachedLastSyncDate = true;
								break;
							}
						}
					} else {
						for (const [index, responseItem] of responseItems.entries()) {
							if (itemsToLoad === 0) {
								this.leftoverHistoryItems = responseItems.slice(index);
								break;
							} else {
								historyItems.push(responseItem);
								itemsToLoad -= 1;
							}
						}
					}
				}
				hasReachedEnd = this.hasReachedHistoryEnd || hasReachedLastSyncDate;
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = await this.convertHistoryItems(historyItems);
			}
			await store.setData({ items, hasReachedEnd, hasReachedLastSyncDate });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load history.', err);
				await EventDispatcher.dispatch('SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
		return items;
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
