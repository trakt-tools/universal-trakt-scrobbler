import * as moment from 'moment';
import { TraktSearch } from '../../../../api/TraktSearch';
import { TraktSync } from '../../../../api/TraktSync';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { EventDispatcher, Events } from '../../../../services/Events';
import { Requests } from '../../../../services/Requests';
import { Api } from '../common/Api';
import { getStore, registerApi } from '../common/common';

export interface NrkHistoryItem {
	lastSeen: NrkLastSeen;
	program: NrkProgramInfo;
}

export interface NrkLastSeen {
	at: string;
	percentageWatched: string;
	percentageAssumedFinished: string;
}

export interface NrkProgramInfo {
	id: string;
	title: string;
	mainTitle: string;
	viewCount: number;
	description: string;
	programType: 'Program' | 'Episode';
	seriesId: string;
	episodeNumber: string;
	totalEpisodesInSeason: string;
	episodeNumberOrDate: string;
	seasonNumber: string;
	productionYear: number;
}

class _NrkApi implements Api {
	HOST_URL: string;
	HISTORY_API_URL: string;
	AUTH_URL: string;
	isActivated: boolean;

	constructor() {
		this.HOST_URL = 'https://tv.nrk.no';
		this.HISTORY_API_URL = `${this.HOST_URL}/history`;
		this.AUTH_URL = `${this.HOST_URL}/auth/token`;

		this.isActivated = false;
	}

	activate = async () => {
		await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		this.isActivated = true;
	};

	loadHistory = async (nextPage: number, nextVisualPage: number, itemsToLoad: number) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			let isLastPage = false;
			let items: Item[] = [];
			const historyItems: NrkHistoryItem[] = [];
			do {
				const responseText = await Requests.send({
					url: `${this.HISTORY_API_URL}?pg=${nextPage}`, //TODO figure out if pagination is even supported in the API
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as NrkHistoryItem[];
				if (responseJson && responseJson.length > 0) {
					itemsToLoad -= responseJson.length;
					historyItems.push(...responseJson);
				} else {
					isLastPage = true;
				}
				nextPage += 1;
			} while (!isLastPage && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = historyItems.map(this.parseHistoryItem);
			}
			nextVisualPage += 1;
			getStore('nrk')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.catch(() => {
					/** Do nothing */
				});
		} catch (err) {
			Errors.error('Failed to load NRK history.', err);
			await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, null, {
				error: err as Error,
			});
		}
	};

	parseHistoryItem = (historyItem: NrkHistoryItem): Item => {
		const program: NrkProgramInfo = historyItem.program;
		let item: Item;
		const id = parseInt(program.id, 10);
		const type = program.programType === 'Episode' ? 'show' : 'movie';
		const year = program.productionYear;
		const percentageWatched = parseInt(historyItem.lastSeen.percentageWatched, 10);
		const watchedAt = moment(this.convertAspNetJSONDateToDateObject(historyItem.lastSeen.at));
		if (type === 'show') {
			const title = program.title.trim();
			const season = parseInt(program.seasonNumber, 10);
			const episode = parseInt(program.episodeNumber, 10);
			const episodeTitle = program.mainTitle.trim();
			item = new Item({
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
				isCollection: false,
				percentageWatched,
				watchedAt,
			});
		} else {
			const title = program.title.trim();
			item = new Item({ id, type, title, year, percentageWatched, watchedAt });
		}
		return item;
	};

	loadTraktHistory = async () => {
		try {
			let promises = [];
			const items = getStore('nrk').data.items;
			promises = items.map(this.loadTraktItemHistory);
			await Promise.all(promises);
			void getStore('nrk').update();
		} catch (err) {
			Errors.error('Failed to load Trakt history.', err);
			await EventDispatcher.dispatch(Events.TRAKT_HISTORY_LOAD_ERROR, { error: err as Error });
		}
	};

	loadTraktItemHistory = async (item: Item) => {
		if (!item.trakt) {
			try {
				item.trakt = await TraktSearch.find(item);
				await TraktSync.loadHistory(item);
			} catch (err) {
				item.trakt = {
					notFound: true,
				};
			}
		}
	};

	convertAspNetJSONDateToDateObject = (value: string): Date => {
		const dateRegexp = /^\/?Date\((-?\d+)/i;
		if (dateRegexp.exec(value) !== null) {
			const dateInMs = parseInt(value.slice(6, 19), 10);
			const i = value.lastIndexOf('+');
			const offset = parseInt(value.substr(i + 1, 4), 10); // Get offset
			const offsetInMs = (offset / 100) * 60 * 60 * 1000;
			const dateWithOffset = dateInMs + offsetInMs;
			return new Date(dateWithOffset);
		}
		return new Date();
	};
}

export const NrkApi = new _NrkApi();

registerApi('nrk', NrkApi);
