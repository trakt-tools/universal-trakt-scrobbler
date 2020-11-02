import * as moment from 'moment';
import { WrongItemApi } from '../../api/WrongItemApi';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { Requests } from '../../common/Requests';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

export interface TeliaContinueWatchingList {
	list: TeliaContinueWatchingItem[];
}
export interface TeliaContinueWatchingItem {
	mediaId: string;
	assetId: string;
	duration: number;
	position: number;
	timestamp: number;
	hidden: boolean;
	serviceType: string;
	mediaObject: TeliaMediaObject;
}

export interface TeliaMediaObject {
	loopId: string;
	seriesTitle: string;
	seasonNumber: number;
	episodeNumber: number;
	productionYear: string;
	validTo: string;
	validFrom: string;
	type: string;
	totalAssets: number;
	title: string;
	storeType: string;
	storeName: string;
	storeId: string;
	seriesId: string;
	seasonId: string;
	renttime: number;
	length: number;
	contentproviderName: string;
	contentproviderId: string;
	titleId: string;
	start: string;
	categories: string[];
}

export interface TeliaAuth {
	message: string;
	geoblock: boolean;
	token: TeliaToken;
}

export interface TeliaToken {
	validTo: string;
	accessToken: string;
	refreshToken: string;
}

export interface TeliaMyList {
	totalHits: number;
	type: string;
	items: TeliaMyListItem[];
}

export interface TeliaMyListItem {
	id: string;
	type: string;
	decorations: { myList: { timestamp: string } };
}

export interface TeliaExploreItem {
	id: string;
	title: string;
	description: string;
	ratingLevel: number;
	ratingName: string;
	parentalControl: boolean;
	references: TeliaExploreItemReferences;
}

export interface TeliaExploreItemReferences {
	globalId: string;
	loopId: string;
	loopSeriesId: string;
	seriesId: string;
	seasonId: string;
}

export interface TeliaShows {
	Success: boolean;
	Data: { directHits: TeliaShowsHit[]; totalHits: number };
}

export interface TeliaShowsHit {
	type: string;
	object: TeliaSeriesObject;
}

export interface TeliaSeriesObject {
	loopId: string;
	title: string;
	seasons: TeliaSeason[];
	productionYear: string;
	totalEpisodes: number;
}

export interface TeliaSeason {
	loopId: string;
	title: string;
	seasonNumber: number;
	productionYear: string;
	totalEpisodes: number;
}

export interface TeliaEpisodes {
	Success: boolean;
	Data: { directHits: TeliaEpisodesDirectHits[]; totalHits: number };
}
export interface TeliaEpisodesDirectHits {
	object: TeliaMediaObject;
}

export interface TeliaWatched {
	map: Map<string, TeliaWatchedItem>;
}

export interface TeliaWatchedItem {
	duration: number;
	position: number;
	timestamp: number;
	hidden: boolean;
}

class _TeliaApi extends Api {
	OTTAPI_URL: string;
	CONTINUE_WATCHING_API_URL: string;
	MY_LIST_API_URL: string;
	EXPLORE_URL: string;
	IPTV_URL: string;
	SHOWS_URL: string;
	AUTH_URL: string;
	WATCHED_URL: string;
	EPISODES_URL: string;
	isActivated: boolean;
	jwt: string;

	constructor() {
		super('telia-play');

		this.AUTH_URL =
			'https://www.teliaplay.se/rest/secure/users/authentication?deviceId=DASHJS_0245b511-4414-4b80-8ead-8e29da49075d&coreVersion=3.35.1&model=desktop_windows&nativeVersion=unknown_nativeVersion&uiVersion=6.24.0(578)';
		this.OTTAPI_URL = 'https://ottapi.prod.telia.net/web/se';
		this.IPTV_URL = 'https://iptvsearch-playplus-prod.han.telia.se/v1';
		this.CONTINUE_WATCHING_API_URL = `${this.OTTAPI_URL}/continuewatching/rest/secure/v2/watchedItems/list/?fromIndex=0&toIndex=1000&serviceTypes=SVOD,VOD&protocols=dash&resolutions=sd`;
		this.MY_LIST_API_URL = `${this.OTTAPI_URL}/mylistgateway/rest/secure/v1/savedItems/list?resolutions=sd&fromIndex=0&toIndex=5000`;
		this.EXPLORE_URL = `${this.OTTAPI_URL}/exploregateway/rest/v3/explore/media`;
		this.SHOWS_URL = `${this.IPTV_URL}/videos?seriesIds={SHOW_IDS}&parental=false&fromIndex=0&toIndex=5000`;
		this.EPISODES_URL = `${this.IPTV_URL}/series/{SHOW_ID}/season/{SEASON_ID}/episodes?sort=episode_asc&parental=false&fromIndex=0&toIndex=5000`;
		this.WATCHED_URL = `${this.OTTAPI_URL}/continuewatching/rest/secure/v2/watchedItems/map/?serviceType=SVOD&mediaIds={EPISODE_IDS}`;
		this.isActivated = false;
		this.jwt = '';
	}

	activate = async () => {
		const response = await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		const responseJson = JSON.parse(response) as TeliaAuth;
		this.jwt = responseJson.token.accessToken;

		this.isActivated = true;
	};

	loadHistory = async (
		nextPage: number,
		nextVisualPage: number,
		itemsToLoad: number
	): Promise<void> => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			const itemsLoaded = 0;
			const isLastPage = false;

			//Get Continue Watching
			const cwResponseText = await this.doGet(`${this.CONTINUE_WATCHING_API_URL}`);
			const cwResponseJson = JSON.parse(cwResponseText) as TeliaContinueWatchingList;
			const cwList = cwResponseJson.list;

			//Get "my list"
			const myListResponse = await this.doGet(`${this.MY_LIST_API_URL}`);
			const myListJson = JSON.parse(myListResponse) as TeliaMyList;

			//Explore my list to find the ids of the shows
			const myListIds = myListJson.items.map((item) => item.id);
			const exploreResponse = await this.doGet(`${this.EXPLORE_URL}/${myListIds.join()}`);
			const exploreJson = JSON.parse(exploreResponse) as TeliaExploreItem[];

			//Get shows to find season ids
			const seriesIds = exploreJson.map((item) => item.references.loopSeriesId);
			//Add shows from "Continue watching" list
			seriesIds.push(...cwList.map((cw) => cw.mediaObject.seriesId));
			const showsUrl = this.SHOWS_URL.replace('{SHOW_IDS}', seriesIds.join());
			const showsResponse = await this.doGet(showsUrl);
			const showsJson = JSON.parse(showsResponse) as TeliaShows;

			//Get episode info for each show / season
			const allEps: TeliaMediaObject[] = [];
			for (const show of showsJson.Data.directHits) {
				const showId = show.object.loopId;
				const showUrl = this.EPISODES_URL.replace('{SHOW_ID}', showId);
				for (const season of show.object.seasons) {
					const seasonUrl = showUrl.replace('{SEASON_ID}', season.loopId);
					const episodesResponse = await this.doGet(seasonUrl);
					const episodesJson = JSON.parse(episodesResponse) as TeliaEpisodes;

					const seasonEpisodes = episodesJson.Data.directHits.map((dh) => dh.object);
					allEps.push(...seasonEpisodes);
				}
			}

			//Get watched status of all episodes
			const episodeIds = allEps.map((e) => e.loopId);
			const watchedUrl = this.WATCHED_URL.replace('{EPISODE_IDS}', episodeIds.join());
			const watchedResponse = await this.doGet(watchedUrl);
			const watchedJson = JSON.parse(watchedResponse) as TeliaWatched;

			const wMap = new Map(Object.entries(watchedJson.map));
			//Limit 10% watched
			const watchedEps = allEps.filter((ep) => this.pctWatched(wMap.get(ep.loopId)) > 10);

			//Convert to items
			let items: Item[] = [];
			items = watchedEps.map((ep) => this.parseHistoryItem(ep, wMap.get(ep.loopId)));

			nextVisualPage += 1;

			await getSyncStore('telia-play')
				.update({ isLastPage, nextPage, nextVisualPage, items })
				.then(this.loadTraktHistory)
				.then(() => WrongItemApi.loadSuggestions(this.id))
				.catch(() => {
					/** Do nothing */
				});
		} catch (err) {
			Errors.error('Failed to load telia history.', err);
			await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
				error: err as Error,
			});
		}
	};

	doGet = (url: string) => {
		return Requests.send({
			url: url,
			method: 'GET',
			headers: { Authorization: `Bearer ${this.jwt}` },
		});
	};

	pctWatched = (watched: TeliaWatchedItem | undefined) => {
		if (typeof watched === 'undefined') {
			return 0;
		}
		return Math.round(100 * (watched.position / watched.duration));
	};

	parseHistoryItem = (mediaObject: TeliaMediaObject, watched: TeliaWatchedItem): Item => {
		let item: Item;
		const serviceId = this.id;
		const id = mediaObject.loopId;
		const type = mediaObject.categories.includes('Film') ? 'movie' : 'show';
		const year = parseInt(mediaObject.productionYear);
		const percentageWatched = this.pctWatched(watched);
		const watchedDate = new Date(watched.timestamp);
		const watchedAt = watchedDate ? moment(watchedDate) : undefined;
		if (type === 'show') {
			const title = mediaObject.seriesTitle;
			const season = mediaObject.seasonNumber;
			const episode = mediaObject.episodeNumber;
			const episodeTitle = mediaObject.title;
			item = new Item({
				serviceId,
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
			const title = mediaObject.title.trim();
			item = new Item({ serviceId, id, type, title, year, percentageWatched, watchedAt });
		}
		return item;
	};
}

export const TeliaApi = new _TeliaApi();

registerApi('telia-play', TeliaApi);
