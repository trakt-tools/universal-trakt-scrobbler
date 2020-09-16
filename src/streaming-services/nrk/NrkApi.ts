import * as moment from 'moment';
import { WrongItemApi } from '../../api/WrongItemApi';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { Requests } from '../../common/Requests';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

interface NrkUserData {
	name: string;
	profileType: string;
	userId: string;
}

interface NrkProgressResponse {
	progresses: NrkProgressItem[];
	_links: {
		backwards?: NrkLinkObject;
		next?: NrkLinkObject;
		self: NrkLinkObject;
	};
}

interface NrkLinkObject {
	href: string;
}

interface NrkProgressItemCommon {
	accessibilityValue: string;
	id: string;
	registeredAt: string;
	_embedded: {
		programs: NrkProgram;
	};
	_links: unknown;
}

type NrkProgressItem = NrkProgressItemFinished | NrkProgressItemInProgress;

interface NrkProgressItemFinished extends NrkProgressItemCommon {
	finished: true;
	progress: 'finished';
}

interface NrkProgressItemInProgress extends NrkProgressItemCommon {
	progress: 'inProgress';
	registeredAt: string;
	inProgress: {
		precentage: number;
		time: string;
	};
}

interface NrkProgram {
	image: unknown;
	titles: {
		title: string;
		subtitle: string;
	};
	_links: unknown;
}

// export interface NrkHistoryItem {
// 	lastSeen: NrkLastSeen;
// 	program: NrkProgramInfo;
// }
//
// export interface NrkLastSeen {
// 	at: string;
// 	percentageWatched: string;
// 	percentageAssumedFinished: string;
// }
//
// export interface NrkProgramInfo {
// 	id: string;
// 	title: string;
// 	mainTitle: string;
// 	viewCount: number;
// 	description: string;
// 	programType: 'Program' | 'Episode';
// 	seriesId: string;
// 	episodeNumber: string;
// 	totalEpisodesInSeason: string;
// 	episodeNumberOrDate: string;
// 	seasonNumber: string;
// 	productionYear: number;
// }

class _NrkApi extends Api {
	HOST_URL: string;
	API_HOST_URL: string;
	HISTORY_API_URL: string;
	TOKEN_URL: string;
	USERDATA_URL: string;
	token: string;
	isActivated: boolean;

	constructor() {
		super('nrk');

		this.HOST_URL = 'https://tv.nrk.no';
		this.API_HOST_URL = 'https://psapi.nrk.no';
		this.HISTORY_API_URL = '';
		this.TOKEN_URL = `${this.HOST_URL}/auth/token`;
		this.USERDATA_URL = `${this.HOST_URL}/auth/userdata`;
		this.token = '';
		this.isActivated = false;
	}

	activate = async () => {
		const stringToken = await Requests.send({
			url: `${this.TOKEN_URL}?_=${Date.now()}`,
			method: 'GET',
		});
		this.token = stringToken.split('"').join('');
		console.warn(this.token);
		const response = await Requests.send({
			url: this.USERDATA_URL,
			method: 'GET',
		});
		const userData: NrkUserData = JSON.parse(response);
		this.HISTORY_API_URL = `${this.API_HOST_URL}/tv/userdata/${userData.userId}/progress`;
		this.isActivated = true;
	};

	loadHistory = async (nextPage: number, nextVisualPage: number, itemsToLoad: number) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			let isLastPage = false;
			let items: Item[] = [];
			const historyItems: NrkProgressItem[] = [];
			do {
				const responseText = await Requests.send({
					url: `${this.HISTORY_API_URL}?sortorder=descending&pageSize=10`,
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + this.token,
					},
				});
				const responseJson: NrkProgressResponse = JSON.parse(responseText);
				const { progresses } = responseJson;
				if (progresses.length > 0) {
					itemsToLoad -= progresses.length;
					historyItems.push(...progresses);
				} else {
					isLastPage = true;
				}
				nextPage += 1;
			} while (!isLastPage && itemsToLoad > 0);
			if (historyItems.length > 0) {
				items = historyItems.map(this.parseHistoryItem);
			}
			nextVisualPage += 1;
			getSyncStore('nrk')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.then(() => WrongItemApi.loadSuggestions(this.id))
				.catch(() => {
					/** Do nothing */
				});
		} catch (err) {
			Errors.error('Failed to load NRK history.', err);
			await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
				error: err as Error,
			});
		}
	};

	parseHistoryItem = (historyItem: NrkProgressItem): Item => {
		let item: Item;
		const serviceId = this.id;
		const id = historyItem.id;
		const type = 'show'; //TODO
		const titleInfo = historyItem._embedded.programs.titles;
		const title = titleInfo.title;
		const episodeTitle = titleInfo.subtitle;
		const watchedAt = historyItem.registeredAt ? moment(historyItem.registeredAt) : undefined;
		if (historyItem.progress === 'inProgress') {
			const percentageWatched = historyItem.inProgress.precentage;
			item = new Item({
				type,
				id,
				serviceId,
				title,
				year: 2020, //TODO
				episodeTitle,
				percentageWatched,
				watchedAt,
			});
		} else {
			item = new Item({
				type,
				id,
				serviceId,
				title,
				year: 2020, //TODO
				episodeTitle,
				watchedAt,
			});
		}
		// const watchedDate = this.convertAspNetJSONDateToDateObject(historyItem.lastSeen.at);
		// const watchedAt = watchedDate ? moment(watchedDate) : undefined;
		// if (type === 'show') {
		// 	const title = program.title.trim();
		// 	const season = parseInt(program.seasonNumber, 10);
		// 	const episode = parseInt(program.episodeNumber, 10);
		// 	const episodeTitle = program.mainTitle.trim();
		// 	item = new Item({
		// 		serviceId,
		// 		id,
		// 		type,
		// 		title,
		// 		year,
		// 		season,
		// 		episode,
		// 		episodeTitle,
		// 		isCollection: false,
		// 		percentageWatched,
		// 		watchedAt,
		// 	});
		// } else {
		// 	const title = program.title.trim();
		// 	item = new Item({ serviceId, id, type, title, year, percentageWatched, watchedAt });
		// }
		return item;
	};

	convertAspNetJSONDateToDateObject = (value: string): Date | undefined => {
		const dateRegexp = /^\/?Date\((-?\d+)/i;
		if (dateRegexp.exec(value) !== null) {
			const dateInMs = parseInt(value.slice(6, 19), 10);
			const i = value.lastIndexOf('+');
			const offset = parseInt(value.substr(i + 1, 4), 10); // Get offset
			const offsetInMs = (offset / 100) * 60 * 60 * 1000;
			const dateWithOffset = dateInMs + offsetInMs;
			return new Date(dateWithOffset);
		}
	};
}

export const NrkApi = new _NrkApi();

registerApi('nrk', NrkApi);
