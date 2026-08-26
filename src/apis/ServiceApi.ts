import { Suggestion } from '@apis/CorrectionApi';
import { TraktSearch } from '@apis/TraktSearch';
import { TraktSync } from '@apis/TraktSync';
import { Cache, CacheItems, HistoryCache } from '@common/Cache';
import { RequestError } from '@common/RequestError';
import { Shared } from '@common/Shared';
import { createScrobbleItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { getSyncStore } from '@stores/SyncStore';

const serviceApis = new Map<string, ServiceApi>();

export const registerServiceApi = (id: string, api: ServiceApi): void => {
	serviceApis.set(id, api);
};

export const getServiceApi = (id: string): ServiceApi => {
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
	hasCheckedHistoryCache = false;
	hasReachedHistoryEnd = false;
	nextHistoryPage = 0;
	nextHistoryUrl = '';
	session?: ServiceApiSession | null;

	constructor(id: string) {
		this.id = id;

		registerServiceApi(this.id, this);
	}

	static async loadTraktHistory(
		items: ScrobbleItem[],
		processItem?: (item: ScrobbleItem) => Promise<ScrobbleItem>,
		cancelKey = 'default'
	): Promise<ScrobbleItem[]> {
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
			const { corrections } = await Shared.storage.get('corrections');
			const promises = [];
			for (const item of newItems) {
				if (
					typeof item.trakt === 'undefined' ||
					(item.trakt && typeof item.trakt.watchedAt === 'undefined')
				) {
					const databaseId = item.getDatabaseId();
					const correction = corrections?.[databaseId];
					promises.push(
						ServiceApi.loadTraktItemHistory(item, caches, correction, processItem, cancelKey)
					);
				} else {
					let promise;
					if (processItem) {
						promise = processItem(item);
					} else {
						promise = Promise.resolve(item);
					}
					promises.push(promise);
				}
			}
			newItems = await Promise.all(promises);
			await Cache.set(caches);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to load Trakt history.', err);
				await Shared.events.dispatch('TRAKT_HISTORY_LOAD_ERROR', null, {
					error: err,
				});
			}
			throw err;
		}
		return newItems;
	}

	static async loadTraktItemHistory(
		item: ScrobbleItem,
		caches: CacheItems<
			['itemsToTraktItems', 'traktItems', 'traktHistoryItems', 'urlsToTraktItems']
		>,
		correction?: Suggestion,
		processItem?: (item: ScrobbleItem) => Promise<ScrobbleItem>,
		cancelKey = 'default'
	): Promise<ScrobbleItem> {
		try {
			if (!item.trakt) {
				item.trakt = await TraktSearch.find(item, caches, correction, cancelKey);
				if (processItem) {
					item = await processItem(item.clone());
				}
			}
			if (item.trakt && typeof item.trakt.watchedAt === 'undefined') {
				await TraktSync.loadHistory(item, caches.traktHistoryItems, false, cancelKey);
				if (processItem) {
					item = await processItem(item.clone());
				}
			}
		} catch (err) {
			console.debug(
				`[UTS] Failed to load Trakt data for "${item.getFullTitle()}" (${item.serviceId})`,
				err
			);
			if (item.trakt) {
				delete item.trakt.watchedAt;
			} else {
				item.trakt = null;
			}
			if (processItem) {
				item = await processItem(item.clone());
			}
			if (err instanceof RequestError && err.isCanceled) {
				throw err;
			}
		}
		return item;
	}

	checkLogin(): Promise<boolean> {
		return Promise.resolve(!!this.session && this.session.profileName !== null);
	}

	async loadHistory(
		itemsToLoad: number,
		lastSync: number,
		lastSyncId: string,
		cancelKey = 'default'
	): Promise<ScrobbleItem[]> {
		let items: ScrobbleItem[] = [];
		try {
			const caches = await Cache.get(['history', 'historyItemsToItems', 'items']);
			let historyCache = caches.history.get(this.id);
			if (!historyCache) {
				historyCache = {
					items: [],
				};
			}
			const store = getSyncStore(this.id);
			let { hasReachedEnd, hasReachedLastSyncDate } = store.data;
			const historyItems: unknown[] = [];
			do {
				let responseItems: unknown[] = [];
				if (this.leftoverHistoryItems.length > 0) {
					responseItems = this.leftoverHistoryItems;
					this.leftoverHistoryItems = [];
				} else if (!this.hasReachedHistoryEnd) {
					responseItems = await this.loadHistoryItems(cancelKey);
					if (!this.hasCheckedHistoryCache) {
						this.hasCheckedHistoryCache = true;
						if (historyCache.items.length > 0) {
							const reconciled = await this.reconcileHistoryCache(
								responseItems,
								historyCache,
								cancelKey
							);
							responseItems = reconciled.items;
							if (reconciled.reusedCache) {
								this.nextHistoryPage = historyCache.nextPage ?? this.nextHistoryPage;
								this.nextHistoryUrl = historyCache.nextUrl ?? this.nextHistoryUrl;
							}
						}
						historyCache = {
							items: [],
						};
					}
					historyCache.nextPage = this.nextHistoryPage;
					historyCache.nextUrl = this.nextHistoryUrl;
					historyCache.items.push(...responseItems);
				}
				for (const [index, responseItem] of responseItems.entries()) {
					if (itemsToLoad === 0) {
						this.leftoverHistoryItems = responseItems.slice(index);
						break;
					} else if (
						lastSync === 0 ||
						!lastSyncId ||
						this.isNewHistoryItem(responseItem, lastSync, lastSyncId)
					) {
						historyItems.push(responseItem);
						itemsToLoad -= 1;
					} else if (lastSync > 0 && lastSyncId) {
						this.leftoverHistoryItems = responseItems.slice(index);
						hasReachedLastSyncDate = true;
						break;
					}
				}
				hasReachedEnd =
					(this.leftoverHistoryItems.length === 0 && this.hasReachedHistoryEnd) ||
					hasReachedLastSyncDate;
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const preparedHistoryItems = await this.prepareHistoryItems(historyItems);
				if (preparedHistoryItems.length !== historyItems.length) {
					throw new Error('prepareHistoryItems() must preserve the number of history items');
				}
				const tmpItems: (ScrobbleItem | null)[] = [];
				const historyItemsToConvert = [];

				for (const historyItem of preparedHistoryItems) {
					const historyItemId = `${this.id}_${this.getHistoryItemId(historyItem)}`;
					const itemId = caches.historyItemsToItems.get(historyItemId);
					if (itemId) {
						const item = caches.items.get(itemId);
						if (item) {
							this.updateItemFromHistory(item, historyItem);
							tmpItems.push(createScrobbleItem(item));
						} else {
							tmpItems.push(null);
							historyItemsToConvert.push(historyItem);
						}
					} else {
						tmpItems.push(null);
						historyItemsToConvert.push(historyItem);
					}
				}

				if (historyItemsToConvert.length > 0) {
					const convertedItems = await this.convertHistoryItems(historyItemsToConvert);
					let index = 0;
					items = tmpItems.map((item) => {
						if (item !== null) {
							return item;
						}

						item = convertedItems[index];
						index += 1;
						return item;
					});
				} else {
					items = tmpItems as ScrobbleItem[];
				}

				for (const [index, historyItem] of preparedHistoryItems.entries()) {
					const historyItemId = `${this.id}_${this.getHistoryItemId(historyItem)}`;
					const item = items[index];
					const itemDatabaseId = item.getDatabaseId();
					caches.historyItemsToItems.set(historyItemId, itemDatabaseId);
					caches.items.set(itemDatabaseId, item.save());
				}
			}
			await store.setData({ items, hasReachedEnd, hasReachedLastSyncDate });
			caches.history.set(this.id, historyCache);
			await Cache.set(caches);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to load history.', err);
				await Shared.events.dispatch('SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err,
				});
			}
			throw err;
		}
		return items;
	}

	/**
	 * Reconciles the cached history with the fresh first page returned by the service.
	 *
	 * The cache stores a contiguous prefix of the history, from the newest item known at the time down to
	 * `nextUrl`/`nextPage`, so that re-opening the history page does not re-request every page (and every
	 * item lookup) from the service - which matters for rate-limited APIs.
	 *
	 * Whether the cache is still valid is decided by history item IDs, not by watched dates: pages are
	 * fetched until an item that is already in the cache is found. Everything before that item is new and
	 * gets prepended, the cached items from that point on are reused (with fresh copies where the service
	 * returned them, so updated progress/dates win). If no cached item is found within a few pages, the
	 * cache is considered stale (e.g. profile switch, history cleared) and the fresh items replace it.
	 *
	 * Returns `reusedCache: true` when pagination should continue from the cached `nextUrl`/`nextPage`.
	 */
	private async reconcileHistoryCache(
		firstPage: unknown[],
		historyCache: HistoryCache,
		cancelKey: string
	): Promise<{ items: unknown[]; reusedCache: boolean }> {
		const cachedIndexes = new Map<string, number>();
		for (const [index, cachedItem] of historyCache.items.entries()) {
			const id = this.getHistoryItemId(cachedItem);
			if (!cachedIndexes.has(id)) {
				cachedIndexes.set(id, index);
			}
		}

		const freshItems: unknown[] = [];
		let page = firstPage;
		let pagesFetched = 1;
		for (;;) {
			let matchIndex = -1;
			for (const item of page) {
				const index = cachedIndexes.get(this.getHistoryItemId(item));
				if (typeof index !== 'undefined') {
					matchIndex = index;
					break;
				}
			}
			freshItems.push(...page);
			if (matchIndex >= 0) {
				if (this.hasReachedHistoryEnd) {
					// The fresh pages already cover the whole history, nothing to reuse
					return { items: freshItems, reusedCache: false };
				}
				const freshIds = new Set(freshItems.map((item) => this.getHistoryItemId(item)));
				const reusedItems = historyCache.items
					.slice(matchIndex)
					.filter((item) => !freshIds.has(this.getHistoryItemId(item)));
				return { items: [...freshItems, ...reusedItems], reusedCache: true };
			}
			if (this.hasReachedHistoryEnd || pagesFetched >= ServiceApi.MAX_CACHE_RECONCILE_PAGES) {
				break;
			}
			page = await this.loadHistoryItems(cancelKey);
			pagesFetched += 1;
		}

		// No overlap with the cache within the pages fetched - treat the cache as stale
		return { items: freshItems, reusedCache: false };
	}

	/**
	 * How many pages to look through for an item that is already cached before giving up on the cache.
	 * Keeps the number of requests bounded when a lot has been watched since the last visit.
	 */
	private static readonly MAX_CACHE_RECONCILE_PAGES = 5;

	reset(): void {
		this.leftoverHistoryItems = [];
		this.hasCheckedHistoryCache = false;
		this.hasReachedHistoryEnd = false;
		this.nextHistoryPage = 0;
		this.nextHistoryUrl = '';
	}

	/**
	 * This method is responsible for loading more history items. It should set `hasReachedHistoryEnd` to true when there are no more history items to load.
	 *
	 * Should be overridden in the child class.
	 */
	loadHistoryItems(_cancelKey = 'default'): Promise<unknown[]> {
		Shared.errors.error('loadHistoryItems() is not implemented in this service!', new Error());
		return Promise.resolve([]);
	}

	/**
	 * This method is responsible for checking if a history item is new, based on `lastSync` and `lastSyncId`.
	 *
	 * Should be overridden in the child class.
	 */
	isNewHistoryItem(_historyItem: unknown, _lastSync: number, _lastSyncId: string): boolean {
		Shared.errors.error('isNewHistoryItem() is not implemented in this service!', new Error());
		return true;
	}

	/**
	 * This method is responsible for returning a unique ID for a history item.
	 *
	 * Should be overridden in the child class.
	 */
	getHistoryItemId(_historyItem: unknown): string {
		Shared.errors.error('getHistoryItemId() is not implemented in this service!', new Error());
		return '';
	}

	/**
	 * Enriches history items before cached items and new items take separate paths.
	 * Implementations must preserve the number and order of the supplied items.
	 */
	prepareHistoryItems(historyItems: unknown[]): Promisable<unknown[]> {
		return historyItems;
	}

	/**
	 * This method is responsible for transforming history items into items.
	 *
	 * Should be overridden in the child class.
	 */
	convertHistoryItems(_historyItems: unknown[]): Promisable<ScrobbleItem[]> {
		Shared.errors.error('convertHistoryItems() is not implemented in this service!', new Error());
		return Promise.resolve([]);
	}

	/**
	 * This method is responsible for updating the `watchedAt` and `progress` data for an item from the history,
	 * when it's retrieved from the cache,
	 * so that it has up-to-date data.
	 *
	 * Should be overridden in the child class.
	 */
	updateItemFromHistory(_item: ScrobbleItemValues, _historyItem: unknown): void {
		Shared.errors.error('updateItemFromHistory() is not implemented in this service!', new Error());
		// Do nothing
	}

	/**
	 * If an item can be retrieved from the API based on the ID, this method should be overridden in the child class.
	 */
	getItem(_id: string): Promise<ScrobbleItem | null> {
		Shared.errors.error('getItem() is not implemented in this service!', new Error());
		return Promise.resolve(null);
	}
}
