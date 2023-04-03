import { NrkService } from '@/nrk/NrkService';
import { ServiceApi } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { Utils } from '@common/Utils';
import {
	BaseItemValues,
	EpisodeItem,
	MovieItem,
	ScrobbleItem,
	ScrobbleItemValues,
} from '@models/Item';

export interface NrkGlobalObject {
	getPlaybackSession: () => NrkSession;
}

interface NrkAuth {
	state: string;
	userAction: string;
	session: {
		accessToken: string;
		expiresIn: number;
		idToken: string;
		user: {
			email: string;
			name: string;
			profileType: string;
			sub: string;
		};
	};
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
		percentage: number;
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
	programInformation: {
		titles: {
			title: string;
		};
		image: NrkImage[];
	};
	_links: {
		seriesPage?: {
			href: string;
			name: string;
			title: string;
		};
		season: {
			name: string;
			title: string;
		};
	};
}

interface NrkImage {
	url: string;
	width: 300 | 600 | 960 | 1280 | 1600 | 1920;
}

export interface NrkSession {
	currentTime: number;
	duration: number;
	mediaItem: {
		id: string;
		title: string;
		subtitle: string;
	};
	playbackSessionId: string;
	// paused: boolean;
	playbackStarted: boolean;
	sequenceObserver: {
		isPaused: boolean;
	};
}

class _NrkApi extends ServiceApi {
	HOST_URL: string;
	API_HOST_URL: string;
	TOKEN_URL: string;
	PROGRAM_URL: string;
	token: string;
	isActivated: boolean;

	authRequests = Requests;

	constructor() {
		super(NrkService.id);

		this.HOST_URL = 'https://tv.nrk.no';
		this.API_HOST_URL = 'https://psapi.nrk.no';
		this.TOKEN_URL = `${this.HOST_URL}/auth/session/tokenforsub/_`;
		this.PROGRAM_URL = '/tv/catalog/programs/';
		this.token = '';
		this.isActivated = false;
	}

	async activate() {
		const authData = await Requests.send({
			url: `${this.TOKEN_URL}?_=${Date.now()}`,
			method: 'GET',
		});
		const data = JSON.parse(authData) as NrkAuth;
		const { accessToken, user } = data.session;
		this.token = accessToken.split('"').join('');
		this.session = {
			profileName: user.name,
		};
		this.nextHistoryUrl = `${this.API_HOST_URL}/tv/userdata/${user.sub}/progress?sortorder=descending&pageSize=10`;
		this.authRequests = withHeaders({
			Authorization: `Bearer ${this.token}`,
		});
		this.isActivated = true;
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(): Promise<NrkProgressItem[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		const responseText = await this.authRequests.send({
			url: this.nextHistoryUrl,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as NrkProgressResponse;
		const responseItems = responseJson.progresses;
		if (responseJson._links.next) {
			this.nextHistoryUrl = this.API_HOST_URL + responseJson._links.next.href;
		} else {
			this.hasReachedHistoryEnd = true;
		}
		return responseItems;
	}

	isNewHistoryItem(historyItem: NrkProgressItem, lastSync: number) {
		return !!historyItem.registeredAt && Utils.unix(historyItem.registeredAt) > lastSync;
	}

	getHistoryItemId(historyItem: NrkProgressItem) {
		return historyItem.id;
	}

	convertHistoryItems(historyItems: NrkProgressItem[]) {
		const promises = historyItems.map((historyItem) => this.parseHistoryItem(historyItem));
		return Promise.all(promises);
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: NrkProgressItem): Promisable<void> {
		item.watchedAt = historyItem.registeredAt ? Utils.unix(historyItem.registeredAt) : undefined;
		item.progress = historyItem.progress === 'inProgress' ? historyItem.inProgress.percentage : 100;
	}

	async parseHistoryItem(historyItem: NrkProgressItem): Promise<ScrobbleItem> {
		const serviceId = this.id;
		const id = historyItem.id;
		const programInfo = historyItem._embedded.programs;
		const programPage = await this.lookupNrkItem(programInfo._links.self.href);
		const type = programPage._links.seriesPage !== undefined ? 'show' : 'movie';
		const titleInfo = programInfo.titles;
		//TODO This is a good point for having fallback-search items. Also this could be used to differenciate displaytitle and searchtitle.
		const title = this.getTitle(programPage);
		const watchedAt = historyItem.registeredAt ? Utils.unix(historyItem.registeredAt) : undefined;

		const baseItem: BaseItemValues = {
			serviceId,
			id,
			title,
			year: programPage.moreInformation.productionYear,
			progress: historyItem.progress === 'inProgress' ? historyItem.inProgress.percentage : 100,
			watchedAt,
		};

		if (type === 'movie') {
			return new MovieItem(baseItem);
		}

		/* Known formats:
		 * S2 / 7. Episode Title
		 * S1 / 9. episode        (no title)
		 * 23.10.2020             (airdate is the only information)
		 */
		const regExp =
			/(?<fullStr>S(?<seasonStr>[0-9]) [/] (?<episodeStr>[0-9]+)[.] (?<partialEpisodeTitle>.+))/g; //This captures Season number, episode number, and episode title.
		const [matches] = [...titleInfo.subtitle.matchAll(regExp)];
		let episodeTitle;
		let season = 0;
		let number = 0;
		if (matches?.groups) {
			const { fullStr, seasonStr, episodeStr, partialEpisodeTitle } = matches.groups;
			episodeTitle = partialEpisodeTitle === 'episode' ? fullStr : partialEpisodeTitle; //If title is not present, use the whole string.
			season = seasonStr ? Number.parseInt(seasonStr) : 0;
			number = episodeStr ? Number.parseInt(episodeStr) : 0;
		} else {
			episodeTitle = titleInfo.subtitle;
		}
		return new EpisodeItem({
			...baseItem,
			title: episodeTitle,
			season,
			number,
			show: {
				serviceId,
				title: baseItem.title,
			},
		});
	}

	getTitle(programPage: NrkProgramPage) {
		const title =
			programPage._links?.seriesPage?.title || programPage.programInformation.titles.title;
		const { originalTitle } = programPage.moreInformation;
		if (originalTitle && !originalTitle.toLowerCase().includes(title.toLowerCase())) {
			//A few times the originalTitle could be a mix of title, season, episode number etc. But follows different patterns. Some Examples:
			//Mr. Robot, s. 4 - UNAUTHORIZED
			//BLINDPASSASJER 1:3.
			//Therese - jenta som forsvant - En kald sak
			//Chris Tarrant's Extreme Railways s. 6
			//Folkeopplysningen 6 - Kroppen på service
			return originalTitle;
		}
		return title;
	}

	async lookupNrkItem(url: string) {
		const response = await Requests.send({
			url: this.API_HOST_URL + url,
			method: 'GET',
		});
		return JSON.parse(response) as NrkProgramPage;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		const programPage = await this.lookupNrkItem(this.PROGRAM_URL + id);
		const title = this.getTitle(programPage);
		const type = programPage._links.seriesPage !== undefined ? 'show' : 'movie';
		const baseItem: BaseItemValues = {
			serviceId: this.id,
			id,
			title,
			year: programPage.moreInformation.productionYear,
		};
		if (type === 'movie') {
			return new MovieItem(baseItem);
		}

		let { title: episodeTitle } = programPage.programInformation.titles;
		const [matches] = [
			...episodeTitle.matchAll(/(?<fullStr>(?<episodeStr>[0-9]+)[.] (?<partialEpisodeTitle>.+))/g),
		];
		let season = 0;
		let number = 0;
		if (matches?.groups) {
			const { fullStr, episodeStr, partialEpisodeTitle } = matches.groups;
			episodeTitle = (partialEpisodeTitle === 'episode' ? fullStr : partialEpisodeTitle) ?? ''; //If title is not present, use the whole string.
			season = Number.parseInt(programPage._links.season.name);
			number = episodeStr ? Number.parseInt(episodeStr) : 0;
		}
		return new EpisodeItem({
			...baseItem,
			title: episodeTitle,
			season,
			number,
			show: {
				serviceId: baseItem.serviceId,
				title: baseItem.title,
			},
		});
	}
}

export const NrkApi = new _NrkApi();
