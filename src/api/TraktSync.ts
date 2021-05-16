import * as moment from 'moment';
import { BrowserStorage } from '../common/BrowserStorage';
import { Errors } from '../common/Errors';
import { EventDispatcher } from '../common/Events';
import { RequestException, Requests } from '../common/Requests';
import { Item } from '../models/Item';
import { TraktApi } from './TraktApi';

export interface TraktHistoryItem {
	id: number;
	watched_at: string;
}

export interface ParsedTraktHistoryItem {
	id: number;
	watched_at: moment.Moment;
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

	loadHistory = async (item: Item): Promise<void> => {
		if (!item.watchedAt || !item.trakt) {
			return;
		}
		const responseText = await Requests.send({
			url: this.getUrl(item),
			method: 'GET',
		});
		const historyItems = JSON.parse(responseText) as TraktHistoryItem[];
		let historyItemMatch: ParsedTraktHistoryItem | null = null;
		for (const historyItem of historyItems) {
			const parsedHistoryItem: ParsedTraktHistoryItem = {
				id: historyItem.id,
				watched_at: moment(historyItem.watched_at),
			};
			if (item.trakt.watchedAt?.isSame(parsedHistoryItem.watched_at)) {
				historyItemMatch = parsedHistoryItem;
				break;
			} else if (item.watchedAt.diff(parsedHistoryItem.watched_at, 'days') === 0) {
				historyItemMatch = parsedHistoryItem;
			}
		}
		if (historyItemMatch) {
			item.trakt.syncId = historyItemMatch.id;
			item.trakt.watchedAt = historyItemMatch.watched_at;
		}
	};

	removeHistory = async (item: Item): Promise<void> => {
		if (!item.trakt?.syncId) {
			return;
		}
		await Requests.send({
			url: `${this.SYNC_URL}/remove`,
			method: 'POST',
			body: {
				ids: [item.trakt.syncId],
			},
		});
		item.trakt.syncId = undefined;
		item.trakt.watchedAt = undefined;
	};

	getUrl = (item: Item): string => {
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
	};

	sync = async (items: Item[]) => {
		try {
			const data = {
				episodes: items
					.filter((item) => item.type === 'show')
					.map((item) => ({
						ids: { trakt: item.trakt?.id },
						watched_at: BrowserStorage.syncOptions.addWithReleaseDate ? 'released' : item.watchedAt,
					})),
				movies: items
					.filter((item) => item.type === 'movie')
					.map((item) => ({
						ids: { trakt: item.trakt?.id },
						watched_at: BrowserStorage.syncOptions.addWithReleaseDate ? 'released' : item.watchedAt,
					})),
			};
			const responseText = await Requests.send({
				url: this.SYNC_URL,
				method: 'POST',
				body: data,
			});
			const responseJson = JSON.parse(responseText) as TraktSyncResponse;
			const notFoundItems = {
				episodes: responseJson.not_found.episodes.map((item) => item.ids.trakt),
				movies: responseJson.not_found.movies.map((item) => item.ids.trakt),
			};
			for (const item of items) {
				if (
					item.trakt &&
					((item.type === 'show' && !notFoundItems.episodes.includes(item.trakt.id)) ||
						(item.type === 'movie' && !notFoundItems.movies.includes(item.trakt.id)))
				) {
					await TraktSync.loadHistory(item);
				}
			}
			await EventDispatcher.dispatch('HISTORY_SYNC_SUCCESS', null, {
				added: responseJson.added,
			});
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to sync history.', err);
				await EventDispatcher.dispatch('HISTORY_SYNC_ERROR', null, { error: err as Error });
			}
		}
	};
}

export const TraktSync = new _TraktSync();
