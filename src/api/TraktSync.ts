import * as moment from 'moment';
import { Item } from '../models/Item';
import { ISyncItem } from '../models/SyncItem';
import { Errors } from '../services/Errors';
import { EventDispatcher, Events } from '../services/Events';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

export interface TraktHistoryItem {
	watched_at: string;
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
		const responseText = await Requests.send({
			url: this.getUrl(item),
			method: 'GET',
		});
		const historyItems = JSON.parse(responseText) as TraktHistoryItem[];
		const historyItem = historyItems.find(
			(x) => moment(x.watched_at).diff(item.watchedAt, 'days') === 0
		);
		(item.trakt as ISyncItem).watchedAt = historyItem && moment(historyItem.watched_at);
	};

	getUrl = (item: Item): string => {
		if (!item.trakt || !('id' in item.trakt)) {
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

	sync = async (items: Item[], addWithReleaseDate: boolean) => {
		try {
			const data = {
				episodes: items
					.filter((item) => item.isSelected && item.type === 'show')
					.map((item) => ({
						ids: { trakt: (item.trakt as ISyncItem).id },
						watched_at: addWithReleaseDate ? 'released' : item.watchedAt,
					})),
				movies: items
					.filter((item) => item.isSelected && item.type === 'movie')
					.map((item) => ({
						ids: { trakt: (item.trakt as ISyncItem).id },
						watched_at: addWithReleaseDate ? 'released' : item.watchedAt,
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
				if (item.isSelected) {
					if (
						item.type === 'show' &&
						!notFoundItems.episodes.includes((item.trakt as ISyncItem).id)
					) {
						(item.trakt as ISyncItem).watchedAt = item.watchedAt;
					} else if (
						item.type === 'movie' &&
						!notFoundItems.movies.includes((item.trakt as ISyncItem).id)
					) {
						(item.trakt as ISyncItem).watchedAt = item.watchedAt;
					}
				}
			}
			await EventDispatcher.dispatch(Events.HISTORY_SYNC_SUCCESS, null, {
				added: responseJson.added,
			});
		} catch (err) {
			Errors.error('Failed to sync history.', err);
			await EventDispatcher.dispatch(Events.HISTORY_SYNC_ERROR, null, { error: err as Error });
		}
	};
}

export const TraktSync = new _TraktSync();
