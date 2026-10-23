import { NrkService } from '@/nrk/NrkService';
import { ServiceApi } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { Shared } from '@common/Shared';
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
	/** The program id (prfId), the same id the player uses */
	contentId: string;
	/** URL friendly series id, only present for episodes */
	seriesId?: string;
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
	/** ISO 8601 duration */
	duration: string;
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
		duration: {
			seconds: number;
			iso8601: string;
		};
		/**
		 * Either the original title of the series or of the episode - which one can only be
		 * told by comparing it with the other episodes in the season.
		 */
		originalTitle: string | null;
		/** The production year of the program itself, not the first year of the series */
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
			href: string;
			name: string;
			title: string;
		};
	};
}

interface NrkSeason {
	_embedded: {
		/** Sequential series */
		episodes?: NrkSeasonEpisode[];
		/** Standard and news series */
		instalments?: NrkSeasonEpisode[];
	};
}

interface NrkSeasonEpisode {
	prfId: string;
	/** Always `null` for instalments, even when the program page has one */
	originalTitle: string | null;
	titles: {
		title: string;
		subtitle: string;
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
	private tokenExpiresAt = 0;
	private seasonOriginalTitles = new Map<string, Promise<(string | null)[]>>();

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
		const { accessToken, expiresIn, user } = data.session;
		this.token = accessToken.split('"').join('');
		this.tokenExpiresAt = expiresIn > 0 ? Utils.unix() + expiresIn : 0;
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

	async loadHistoryItems(cancelKey = 'default'): Promise<NrkProgressItem[]> {
		// `reset()` clears `nextHistoryUrl` without clearing `isActivated`, so re-activate
		// whenever the URL is missing to avoid sending a request with an empty URL.
		// Also re-activate when the access token has expired, to pick up a fresh one.
		if (!this.isActivated || !this.nextHistoryUrl || this.isTokenExpired()) {
			await this.activate();
		}
		const responseText = await this.authRequests.send({
			url: this.nextHistoryUrl,
			method: 'GET',
			cancelKey,
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

	private isTokenExpired(): boolean {
		return this.tokenExpiresAt > 0 && Utils.unix() >= this.tokenExpiresAt;
	}

	isNewHistoryItem(historyItem: NrkProgressItem, lastSync: number) {
		return !!historyItem.registeredAt && Utils.unix(historyItem.registeredAt) > lastSync;
	}

	getHistoryItemId(historyItem: NrkProgressItem) {
		return historyItem.id;
	}

	async convertHistoryItems(historyItems: NrkProgressItem[]) {
		const items: ScrobbleItem[] = [];
		// Each item requires a program page lookup - run them sequentially to avoid
		// bursting the API with one request per item on large (first-time) syncs
		for (const historyItem of historyItems) {
			items.push(await this.parseHistoryItem(historyItem));
		}
		return items;
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: NrkProgressItem): Promisable<void> {
		item.watchedAt = historyItem.registeredAt ? Utils.unix(historyItem.registeredAt) : undefined;
		item.progress = this.getProgress(historyItem);
	}

	private getProgress(historyItem: NrkProgressItem): number {
		return historyItem.progress === 'inProgress' ? historyItem.inProgress.percentage : 100;
	}

	async parseHistoryItem(historyItem: NrkProgressItem): Promise<ScrobbleItem> {
		const serviceId = this.id;
		const id = historyItem.id;
		const programInfo = historyItem._embedded.programs;
		let programPage: NrkProgramPage | null = null;
		try {
			programPage = await this.lookupNrkItem(programInfo._links.self.href);
		} catch (err) {
			// The program may have been removed from NRK - the history item still embeds
			// enough information (the titles) to build a searchable item, so degrade
			// gracefully instead of failing the whole history load
			console.debug('[UTS] Failed to look up NRK program, using embedded titles', id, err);
		}
		const titleInfo = programInfo.titles;
		const title = programPage ? await this.getShowTitle(programPage) : titleInfo.title;
		const watchedAt = historyItem.registeredAt ? Utils.unix(historyItem.registeredAt) : undefined;

		const baseItem: BaseItemValues = {
			serviceId,
			id,
			title,
			year: programPage?.moreInformation.productionYear,
			progress: this.getProgress(historyItem),
			watchedAt,
		};

		/* Known formats:
		 * S2 / 7. Episode Title
		 * S1 / 9. episode        (no title)
		 * 23.10.2020             (airdate is the only information)
		 */
		const regExp =
			/(?<fullStr>S(?<seasonStr>[0-9]+) [/] (?<episodeStr>[0-9]+)[.] (?<partialEpisodeTitle>.+))/g; //This captures Season number, episode number, and episode title.
		const [matches] = [...titleInfo.subtitle.matchAll(regExp)];

		// Without the program page, fall back to the subtitle format to detect episodes
		const type = programPage
			? programPage._links.seriesPage !== undefined
				? 'show'
				: 'movie'
			: matches
				? 'show'
				: 'movie';

		if (type === 'movie') {
			return new MovieItem(baseItem);
		}
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

	async getShowTitle(programPage: NrkProgramPage) {
		if (!programPage._links.seriesPage) {
			return this.getTitle(programPage, programPage.moreInformation.originalTitle);
		}
		return this.getTitle(programPage, await this.getSeriesOriginalTitle(programPage));
	}

	getTitle(programPage: NrkProgramPage, originalTitle: string | null) {
		const title =
			programPage._links?.seriesPage?.title || programPage.programInformation.titles.title;
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

	/**
	 * The `originalTitle` of an episode is sometimes the original title of the series
	 * ("All Creatures Great and Small") and sometimes of the episode itself ("Rock House, The"
	 * for Alone, "Psyk" for Folkeopplysningen). It is only treated as the series title when
	 * most episodes in the season share it - a single special or "making of" episode with its
	 * own title shouldn't hide the series title for the rest.
	 */
	private async getSeriesOriginalTitle(programPage: NrkProgramPage): Promise<string | null> {
		const { originalTitle } = programPage.moreInformation;
		const seasonUrl = programPage._links.season?.href;
		if (!originalTitle || !seasonUrl) {
			return null;
		}
		let seasonTitles = this.seasonOriginalTitles.get(seasonUrl);
		if (!seasonTitles) {
			seasonTitles = this.lookupSeasonOriginalTitles(seasonUrl);
			this.seasonOriginalTitles.set(seasonUrl, seasonTitles);
		}
		let titles: (string | null)[];
		try {
			titles = await seasonTitles;
		} catch (err) {
			this.seasonOriginalTitles.delete(seasonUrl);
			console.debug('[UTS] Failed to look up NRK season, ignoring original title', seasonUrl, err);
			return null;
		}
		const counts = new Map<string, number>();
		for (const title of titles) {
			if (title) {
				counts.set(title, (counts.get(title) ?? 0) + 1);
			}
		}
		const seriesTitle = [...counts].find(([, count]) => count > titles.length / 2)?.[0];
		if (!seriesTitle) {
			return null;
		}
		// Strip season suffixes, e.g. "The Jetty s.1", "Hunter, sesong 2", "BLINDPASSASJER 1:3."
		return seriesTitle
			.replace(/(?:[\s,.-]+(?:s|ses|sesong|season)\.?\s*\d+|\s+\d+:\d+\.?)$/i, '')
			.trim();
	}

	private async lookupSeasonOriginalTitles(seasonUrl: string) {
		const response = await Requests.send({
			url: this.API_HOST_URL + seasonUrl,
			method: 'GET',
		});
		const season = JSON.parse(response) as NrkSeason;
		const episodes = season._embedded.episodes ?? season._embedded.instalments ?? [];
		return episodes.map((episode) => episode.originalTitle);
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
		const title = await this.getShowTitle(programPage);
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

Shared.functionsToInject[`${NrkService.id}-item-id`] = () => {
	let itemId: string | null = null;
	const { player } = window;
	if (player) {
		const playbackSession = player.getPlaybackSession();
		if (playbackSession) {
			itemId = playbackSession.mediaItem?.id ?? null;
		}
	}
	return itemId;
};

export const NrkApi = new _NrkApi();
