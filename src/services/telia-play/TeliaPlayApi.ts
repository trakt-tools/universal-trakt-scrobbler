import { TeliaPlayService } from '@/telia-play/TeliaPlayService';
import { ServiceApi } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { Utils } from '@common/Utils';
import { Item } from '@models/Item';

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
	seasons: TeliaSeason[];
	totalEpisodes: number;
	age: number;
	watched?: TeliaWatchedItem;
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

export interface TeliaHits {
	Success: boolean;
	Data: { directHits: TeliaHit[]; totalHits: number };
}

export interface TeliaHit {
	type: string;
	object: TeliaMediaObject;
}

export interface TeliaSeason {
	loopId: string;
	title: string;
	seasonNumber: number;
	productionYear: string;
	totalEpisodes: number;
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

class _TeliaPlayApi extends ServiceApi {
	OTTAPI_URL: string;
	CONTINUE_WATCHING_API_URL: string;
	MY_LIST_API_URL: string;
	EXPLORE_URL: string;
	IPTV_URL: string;
	VIDEOS_URL: string;
	AUTH_URL: string;
	WATCHED_URL: string;
	EPISODES_URL: string;
	isActivated: boolean;
	jwt: string;

	constructor() {
		super(TeliaPlayService.id);

		this.AUTH_URL =
			'https://www.teliaplay.se/rest/secure/users/authentication?deviceId=DASHJS_0245b511-4414-4b80-8ead-8e29da49075d&coreVersion=3.35.1&model=desktop_windows&nativeVersion=unknown_nativeVersion&uiVersion=6.24.0(578)';
		this.OTTAPI_URL = 'https://ottapi.prod.telia.net/web/se';
		this.IPTV_URL = 'https://iptvsearch-playplus-prod.han.telia.se/v1';
		this.CONTINUE_WATCHING_API_URL = `${this.OTTAPI_URL}/continuewatching/rest/secure/v2/watchedItems/list/?fromIndex=0&toIndex=1000&serviceTypes=SVOD,VOD&protocols=dash&resolutions=sd`;
		this.MY_LIST_API_URL = `${this.OTTAPI_URL}/mylistgateway/rest/secure/v1/savedItems/list?resolutions=sd&fromIndex=0&toIndex=5000`;
		this.EXPLORE_URL = `${this.OTTAPI_URL}/exploregateway/rest/v3/explore/media`;
		this.VIDEOS_URL = `${this.IPTV_URL}/videos?seriesIds={SERIES_IDS}&oneCoverIds={SERIES_IDS}&parental=false&fromIndex=0&toIndex=5000`;
		this.EPISODES_URL = `${this.IPTV_URL}/series/{SHOW_ID}/season/{SEASON_ID}/episodes?sort=episode_asc&parental=false&fromIndex=0&toIndex=5000`;
		this.WATCHED_URL = `${this.OTTAPI_URL}/continuewatching/rest/secure/v2/watchedItems/map/?serviceType=SVOD&mediaIds={EPISODE_IDS}`;
		this.isActivated = false;
		this.jwt = '';
	}

	async activate() {
		const response = await Requests.send({
			url: this.AUTH_URL,
			method: 'GET',
		});
		const responseJson = JSON.parse(response) as TeliaAuth;
		this.jwt = responseJson.token.accessToken;

		this.session = {
			profileName: '',
		};

		this.isActivated = true;
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(): Promise<TeliaMediaObject[]> {
		if (!this.isActivated) {
			await this.activate();
		}

		// Get Continue Watching
		const cwResponseText = await this.doGet(this.CONTINUE_WATCHING_API_URL);
		const cwResponseJson = JSON.parse(cwResponseText) as TeliaContinueWatchingList;
		const cwList = cwResponseJson.list;

		// Get "my list"
		const myListResponse = await this.doGet(this.MY_LIST_API_URL);
		const myListJson = JSON.parse(myListResponse) as TeliaMyList;
		const myListIds = myListJson.items.map((item) => item.id);

		// Explore my list to find the ids of the shows
		const exploreResponse = await this.doGet(`${this.EXPLORE_URL}/${myListIds.join()}`);
		const exploreJson = JSON.parse(exploreResponse) as TeliaExploreItem[];

		// Get videos to find season ids and movie metadata
		const seriesIds: string[] = [];
		// Add shows from explore & "Continue watching" list
		seriesIds.push(...exploreJson.map((item) => item.references.loopSeriesId));
		seriesIds.push(...cwList.map((cw) => cw.mediaObject.seriesId));
		// Add movie IDs from both lists
		const movieIds = exploreJson
			.filter((e) => !e.references.seriesId)
			.map((e) => e.references.loopId);
		const movieIdsFromCw = cwList
			.filter((cw) => !cw.mediaObject.seriesId)
			.map((cw) => cw.mediaObject.loopId);
		movieIds.push(...movieIdsFromCw);
		seriesIds.push(...movieIds);
		const ids = seriesIds.join();
		// Must replace both ID lists for movies to work
		const videosUrl = this.VIDEOS_URL.replace('{SERIES_IDS}', ids).replace('{SERIES_IDS}', ids);
		const videosResponse = await this.doGet(videosUrl);
		const videosJson = JSON.parse(videosResponse) as TeliaHits;

		// Get episode info for each show / season and movies
		const allEpisodes: TeliaMediaObject[] = [];
		const movies: TeliaMediaObject[] = [];
		for (const hit of videosJson.Data.directHits) {
			if (this.parseType(hit.object) === 'show') {
				const showId = hit.object.loopId;
				const showUrl = this.EPISODES_URL.replace('{SHOW_ID}', showId);
				for (const season of hit.object.seasons) {
					const seasonUrl = showUrl.replace('{SEASON_ID}', season.loopId);
					const episodesResponse = await this.doGet(seasonUrl);
					const episodesJson = JSON.parse(episodesResponse) as TeliaHits;

					const seasonEpisodes = episodesJson.Data.directHits.map((directHit) => directHit.object);
					allEpisodes.push(...seasonEpisodes);
				}
			} else {
				movies.push(hit.object);
			}
		}

		// Get watched status of all episodes / movies
		const episodeIds = allEpisodes.map((episode) => episode.loopId);
		const allIds = [...movieIds, ...episodeIds];
		const watchedUrl = this.WATCHED_URL.replace('{EPISODE_IDS}', allIds.join());
		const watchedResponse = await this.doGet(watchedUrl);
		const watchedJson = JSON.parse(watchedResponse) as TeliaWatched;
		const watchedMap = new Map<string, TeliaWatchedItem>(Object.entries(watchedJson.map));
		for (const episode of allEpisodes) {
			episode.watched = watchedMap.get(episode.loopId);
		}
		for (const movie of movies) {
			movie.watched = watchedMap.get(movie.loopId);
		}

		// Limit 10% watched
		const watchedEpisodes = allEpisodes.filter(
			(episode) => this.getPercentageWatched(episode.watched) > 10
		);
		const watchedMovies = movies.filter((movie) => this.getPercentageWatched(movie.watched));

		// Skip season and episode-less shows (news shows and such)
		const validEpisodes = watchedEpisodes.filter(
			(episode) => episode.seasonNumber > 0 && episode.episodeNumber > 0
		);

		const historyItems: TeliaMediaObject[] = [];
		historyItems.push(...validEpisodes);
		historyItems.push(...watchedMovies);

		this.hasReachedHistoryEnd = true;

		return historyItems;
	}

	getHistoryItemId(historyItem: TeliaMediaObject) {
		return historyItem.loopId;
	}

	convertHistoryItems(historyItems: TeliaMediaObject[]) {
		const items = historyItems.map((historyItem) => this.parseHistoryItem(historyItem));
		return items;
	}

	async doGet(url: string) {
		const response = await Requests.send({
			url: url,
			method: 'GET',
			headers: { Authorization: `Bearer ${this.jwt}` },
		});

		return response;
	}

	getPercentageWatched(watched: TeliaWatchedItem | undefined) {
		if (typeof watched === 'undefined') {
			return 0;
		}
		return Math.round(100 * (watched.position / watched.duration));
	}

	parseType(mediaObject: TeliaMediaObject) {
		return mediaObject.categories.includes('Film') ? 'movie' : 'show';
	}

	parseHistoryItem(mediaObject: TeliaMediaObject): Item {
		let item: Item;
		const serviceId = this.id;
		const id = mediaObject.loopId;
		const type = this.parseType(mediaObject);
		const year = parseInt(mediaObject.productionYear);
		const progress = this.getPercentageWatched(mediaObject.watched);
		const watchedAt = mediaObject.watched ? Utils.unix(mediaObject.watched.timestamp) : undefined;
		if (type === 'show') {
			const title = mediaObject.seriesTitle;
			const season = mediaObject.seasonNumber;
			const episode = mediaObject.episodeNumber;

			// Cleanup HBO titles on the format "01:01 I Was Flying - Avenue 5"
			let episodeTitle = mediaObject.title;
			if (mediaObject.contentproviderName === 'HBO') {
				if (episodeTitle.search(/^\d\d:\d\d\s/) > -1 && episodeTitle.search(` - ${title}`) > 0) {
					episodeTitle = episodeTitle.replace(/^\d\d:\d\d\s/, '').replace(` - ${title}`, '');
				}
			}

			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
				progress,
				watchedAt,
			});
		} else {
			const title = mediaObject.title.trim();
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				progress,
				watchedAt,
			});
		}
		return item;
	}
}

export const TeliaPlayApi = new _TeliaPlayApi();
