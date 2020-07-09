import * as moment from 'moment';
import { Errors } from '../services/Errors';
import { Events, EventDispatcher } from '../services/Events';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';
import { Item } from '../models/Item';
import { ISyncItem } from '../models/SyncItem';

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

		this.loadHistory = this.loadHistory.bind(this);
		this.getUrl = this.getUrl.bind(this);
		this.sync = this.sync.bind(this);
	}

	async loadHistory(item: Item): Promise<void> {
		const responseText = await Requests.send({
			url: this.getUrl(item),
			method: 'GET',
		});
		const historyItems = JSON.parse(responseText) as TraktHistoryItem[];
		const historyItem = historyItems.find(
			(x) => moment(x.watched_at).diff(item.watchedAt, 'days') === 0
		);
		(item.trakt as ISyncItem).watchedAt = historyItem && moment(historyItem.watched_at);
	}

	getUrl(item: Item) {
		let url = '';
		if (item.type === 'show') {
			url = `${this.SYNC_URL}/episodes/${(item.trakt as ISyncItem).id}`;
		} else {
			url = `${this.SYNC_URL}/movies/${(item.trakt as ISyncItem).id}`;
		}
		return url;
	}

	async sync(items: Item[], addWithReleaseDate: boolean) {
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
			await EventDispatcher.dispatch(Events.HISTORY_SYNC_SUCCESS, { added: responseJson.added });
		} catch (err) {
			Errors.error('Failed to sync history.', err);
			await EventDispatcher.dispatch(Events.HISTORY_SYNC_ERROR, { error: err as Error });
		}
	}
}

export const TraktSync = new _TraktSync();
