import * as moment from 'moment';
import { TmdbApi } from '../../api/TmdbApi';
import { WrongItemApi } from '../../api/WrongItemApi';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { Requests } from '../../common/Requests';
import { IItem, Item } from '../../models/Item';
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
		next: NrkLinkObject;
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
	_links: {
		deleteProgress: NrkLinkObject;
		programs: NrkLinkObject;
		self: NrkLinkObject;
	};
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
	_links: {
		self: NrkLinkObject;
		share: NrkLinkObject;
	};
}

interface NrkProgramPage {
	moreInformation: {
		category: {
			id: string;
		};
		originalTitle: string;
		productionYear: number;
	};
	_links: {
		seriesPage?: {
			href: string;
			name: string;
			title: string;
		};
	};
}

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
		const response = await Requests.send({
			url: this.USERDATA_URL,
			method: 'GET',
		});
		const userData = JSON.parse(response) as NrkUserData;
		this.HISTORY_API_URL = `${this.API_HOST_URL}/tv/userdata/${userData.userId}/progress?sortorder=descending&pageSize=10`;
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
					url: this.HISTORY_API_URL,
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + this.token,
					},
				});
				const responseJson = JSON.parse(responseText) as NrkProgressResponse;
				const { progresses } = responseJson;
				this.HISTORY_API_URL = this.API_HOST_URL + responseJson._links.next.href;
				if (progresses.length > 0) {
					itemsToLoad -= progresses.length;
					historyItems.push(...progresses);
				} else {
					isLastPage = true;
				}
				nextPage += 1;
			} while (!isLastPage && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const promises = historyItems.map(this.parseHistoryItem);
				items = await Promise.all(promises);
			}
			nextVisualPage += 1;
			getSyncStore('nrk')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.then(() => TmdbApi.loadImages(this.id))
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

	parseHistoryItem = async (historyItem: NrkProgressItem): Promise<Item> => {
		const serviceId = this.id;
		const id = historyItem.id;
		const programInfo = historyItem._embedded.programs;
		const programPage = await this.lookupNrkItem(programInfo._links.self.href);
		const type = programPage._links.seriesPage !== undefined ? 'show' : 'movie';
		const titleInfo = programInfo.titles;
		const title = programPage.moreInformation.originalTitle ?? titleInfo.title;
		const watchedAt = historyItem.registeredAt ? moment(historyItem.registeredAt) : undefined;

		const baseItem: IItem = {
			type,
			id,
			serviceId,
			title,
			year: programPage.moreInformation.productionYear,
			percentageWatched:
				historyItem.progress === 'inProgress' ? historyItem.inProgress.precentage : 100,
			watchedAt,
		};

		if (type === 'show') {
			/* Known formats:
			 * S2 / 7. Episode Title
			 * S1 / 9. episode        (no title)
			 * 23.10.2020             (airdate is the only information)
			 */
			const regExp = /S([0-9]) [/] ([0-9]+)[.] (.+)/g; //This captures Season number, episode number, and episode title.
			const capturedEpisodeData = [...titleInfo.subtitle.matchAll(regExp)];
			let episodeTitle;
			let extraInfo;
			if (capturedEpisodeData.length) {
				const epInfo = capturedEpisodeData[0];
				episodeTitle = epInfo[3] === 'episode' ? epInfo[0] : epInfo[3]; //If title is not present, use the whole string.
				extraInfo = {
					season: Number.parseInt(epInfo[1]),
					episode: Number.parseInt(epInfo[2]),
				};
			} else {
				episodeTitle = titleInfo.subtitle;
			}
			return new Item({
				...baseItem,
				episodeTitle,
				...extraInfo,
			});
		} else {
			return new Item(baseItem);
		}
	};

	lookupNrkItem = async (url: string) => {
		const response = await Requests.send({
			url: this.API_HOST_URL + url,
			method: 'GET',
		});
		return JSON.parse(response) as NrkProgramPage;
	};
}

export const NrkApi = new _NrkApi();

registerApi('nrk', NrkApi);
