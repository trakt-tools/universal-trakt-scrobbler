import { TraktApi } from '@apis/TraktApi';
import { Cache, CacheItem } from '@common/Cache';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Item } from '@models/Item';
import { SyncStore } from '@stores/SyncStore';

export interface TraktHistoryItem {
	id: number;
	watched_at: string;
}

export interface ParsedTraktHistoryItem {
	id: number;
	watched_at: number;
}

export interface TraktSyncResponse {
	added: {
		episodes: number;
		movies: number;
	};
	not_found: {
		episodes: TraktSyncNotFound[];
		movies: TraktSyncNotFound[];
	};
}

export interface TraktSyncNotFound {
	ids: {
		trakt: number;
	};
}

class _TraktSync extends TraktApi {
	constructor() {
		super();
	}

	async loadHistory(
		item: Item,
		traktHistoryItemsCache: CacheItem<'traktHistoryItems'>,
		forceRefresh = false
	): Promise<void> {
		const watchedAt = item.trakt?.watchedAt || item.getWatchedDate();
		if (!item.trakt || !watchedAt) {
			return;
		}
		const databaseId = item.trakt.getDatabaseId();
		let historyItems = forceRefresh ? null : traktHistoryItemsCache.get(databaseId);
		if (!historyItems) {
			await this.activate();
			const responseText = await this.requests.send({
				url: this.getUrl(item),
				method: 'GET',
				cancelKey: forceRefresh ? 'sync' : 'default',
			});
			historyItems = JSON.parse(responseText) as TraktHistoryItem[];
			traktHistoryItemsCache.set(databaseId, historyItems);
		}
		let historyItemMatch: ParsedTraktHistoryItem | null = null;
		for (const historyItem of historyItems) {
			const parsedHistoryItem: ParsedTraktHistoryItem = {
				id: historyItem.id,
				watched_at: Utils.unix(historyItem.watched_at),
			};
			if (watchedAt === parsedHistoryItem.watched_at) {
				historyItemMatch = parsedHistoryItem;
				break;
			} else if (Utils.dateDiff(watchedAt, parsedHistoryItem.watched_at, 26 * 60 * 60)) {
				historyItemMatch = parsedHistoryItem;
			}
		}
		if (historyItemMatch) {
			item.trakt.syncId = historyItemMatch.id;
			item.trakt.watchedAt = historyItemMatch.watched_at;
		} else {
			item.trakt.watchedAt = null;
		}
	}

	async removeHistory(item: Item): Promise<void> {
		if (!item.trakt?.syncId) {
			return;
		}
		await this.activate();
		await this.requests.send({
			url: `${this.SYNC_URL}/remove`,
			method: 'POST',
			body: {
				ids: [item.trakt.syncId],
			},
		});
		item.trakt.syncId = undefined;
		item.trakt.watchedAt = undefined;
	}

	getUrl(item: Item): string {
		if (!item.trakt) {
			return '';
		}
		let url = '';
		if (item.trakt.type === 'show') {
			url = `${this.SYNC_URL}/episodes/${item.trakt.id}`;
		} else {
			url = `${this.SYNC_URL}/movies/${item.trakt.id}`;
		}
		return url;
	}

	async sync(store: SyncStore, items: Item[]) {
		const newItems: Item[] = [];
		try {
			const data = {
				episodes: items
					.filter((item) => item.type === 'show')
					.map((item) => ({
						ids: { trakt: item.trakt?.id },
						watched_at: Utils.convertToISOString(item.getWatchedDate()),
					})),
				movies: items
					.filter((item) => item.type === 'movie')
					.map((item) => ({
						ids: { trakt: item.trakt?.id },
						watched_at: Utils.convertToISOString(item.getWatchedDate()),
					})),
			};
			await this.activate();
			const responseText = await this.requests.send({
				url: this.SYNC_URL,
				method: 'POST',
				body: data,
				cancelKey: 'sync',
			});
			const responseJson = JSON.parse(responseText) as TraktSyncResponse;
			const notFoundItems = {
				episodes: responseJson.not_found.episodes.map((item) => item.ids.trakt),
				movies: responseJson.not_found.movies.map((item) => item.ids.trakt),
			};
			const traktHistoryItemsCache = await Cache.get('traktHistoryItems');
			for (const item of items) {
				if (
					item.trakt &&
					((item.type === 'show' && !notFoundItems.episodes.includes(item.trakt.id)) ||
						(item.type === 'movie' && !notFoundItems.movies.includes(item.trakt.id)))
				) {
					const newItem = item.clone();
					await TraktSync.loadHistory(newItem, traktHistoryItemsCache, true);
					newItem.isSelected = false;
					newItems.push(newItem);
				}
			}
			await Cache.set({ traktHistoryItems: traktHistoryItemsCache });
			await store.update(newItems, true);
			await Shared.events.dispatch('HISTORY_SYNC_SUCCESS', null, {
				added: responseJson.added,
			});
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to sync history.', err);
				await store.update(newItems, true);
				await Shared.events.dispatch('HISTORY_SYNC_ERROR', null, { error: err });
			}
		}
	}
}

export const TraktSync = new _TraktSync();
