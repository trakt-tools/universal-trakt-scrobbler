import { NetflixService } from '@/netflix/NetflixService';
import { ServiceApi } from '@apis/ServiceApi';
import { Errors } from '@common/Errors';
import { RequestException, Requests } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Item } from '@models/Item';
import * as moment from 'moment';

export interface NetflixGlobalObject {
	appContext: {
		state: {
			playerApp: {
				getState: () => NetflixPlayerState;
			};
		};
	};
	reactContext: {
		models: {
			userInfo: {
				data: {
					authURL: string;
				};
			};
			serverDefs: {
				data: {
					BUILD_IDENTIFIER: string;
				};
			};
		};
	};
}

export interface NetflixPlayerState {
	videoPlayer: {
		playbackStateBySessionId: Record<string, NetflixScrobbleSession | null>;
	};
}

export interface NetflixApiParams {
	authUrl: string;
	buildIdentifier: string;
}

export interface NetflixScrobbleSession {
	currentTime: number;
	duration: number;
	paused: boolean;
	playing: boolean;
	videoId: number;
}

export interface NetflixHistoryResponse {
	viewedItems: NetflixHistoryItem[];
}

export type NetflixHistoryItem = NetflixHistoryShowItem | NetflixHistoryMovieItem;

export interface NetflixHistoryShowItem {
	bookmark: number;
	date: number;
	duration: number;
	episodeTitle: string;
	movieID: number;
	seasonDescriptor: string;
	series: number;
	seriesTitle: string;
	title: string;
}

export interface NetflixHistoryMovieItem {
	bookmark: number;
	date: number;
	duration: number;
	movieID: number;
	title: string;
}

export interface NetflixMetadataResponse {
	value: {
		videos: { [key: number]: NetflixMetadataItem };
	};
}

export type NetflixMetadataItem = NetflixMetadataShowItem | NetflixMetadataMovieItem;

export interface NetflixMetadataShowItem {
	releaseYear: number;
	summary: {
		episode: number;
		id: number;
		season: number;
	};
}

export interface NetflixMetadataMovieItem {
	releaseYear: number;
	summary: {
		id: number;
	};
}

export interface NetflixSingleMetadataItem {
	video: NetflixMetadataShow | NetflixMetadataMovie;
}

export interface NetflixMetadataGeneric {
	id: number;
	title: string;
	year: number;
}

export type NetflixMetadataShow = NetflixMetadataGeneric & {
	type: 'show';
	currentEpisode: number;
	seasons: NetflixMetadataShowSeason[];
};

export interface NetflixMetadataShowSeason {
	episodes: NetflixMetadataShowEpisode[];
	seq: number;
	shortName: string;
}

export interface NetflixMetadataShowEpisode {
	id: number;
	seq: number;
	title: string;
}

export type NetflixMetadataMovie = NetflixMetadataGeneric & {
	type: 'movie';
};

export type NetflixHistoryItemWithMetadata =
	| NetflixHistoryShowItemWithMetadata
	| NetflixHistoryMovieItemWithMetadata;

export type NetflixHistoryShowItemWithMetadata = NetflixHistoryShowItem & NetflixMetadataShowItem;

export type NetflixHistoryMovieItemWithMetadata = NetflixHistoryMovieItem &
	NetflixMetadataMovieItem;

class _NetflixApi extends ServiceApi {
	HOST_URL: string;
	API_URL: string;
	ACTIVATE_URL: string;
	AUTH_REGEX: RegExp;
	BUILD_IDENTIFIER_REGEX: RegExp;
	isActivated: boolean;
	apiParams: Partial<NetflixApiParams>;
	nextHistoryPage = 0;

	constructor() {
		super(NetflixService.id);

		this.HOST_URL = 'https://www.netflix.com';
		this.API_URL = `${this.HOST_URL}/api/shakti`;
		this.ACTIVATE_URL = `${this.HOST_URL}/Activate`;
		this.AUTH_REGEX = /"authURL":"(.*?)"/;
		this.BUILD_IDENTIFIER_REGEX = /"BUILD_IDENTIFIER":"(.*?)"/;

		this.isActivated = false;
		this.apiParams = {};
	}

	extractAuthUrl(text: string): string | undefined {
		return this.AUTH_REGEX.exec(text)?.[1];
	}

	extractBuildIdentifier(text: string): string | undefined {
		return this.BUILD_IDENTIFIER_REGEX.exec(text)?.[1];
	}

	async activate() {
		// If we can access the global netflix object from the page, there is no need to send a request to Netflix in order to retrieve the API params.
		const apiParams = await this.getApiParams();
		if (apiParams && this.checkParams(apiParams)) {
			this.apiParams.authUrl = apiParams.authUrl;
			this.apiParams.buildIdentifier = apiParams.buildIdentifier;
		} else {
			const responseText = await Requests.send({
				url: this.ACTIVATE_URL,
				method: 'GET',
			});
			this.apiParams.authUrl = this.extractAuthUrl(responseText);
			this.apiParams.buildIdentifier = this.extractBuildIdentifier(responseText);
		}
		this.isActivated = true;
	}

	checkParams(apiParams: Partial<NetflixApiParams>): apiParams is NetflixApiParams {
		return (
			typeof apiParams.authUrl !== 'undefined' && typeof apiParams.buildIdentifier !== 'undefined'
		);
	}

	async loadHistoryItems(): Promise<NetflixHistoryItem[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.checkParams(this.apiParams)) {
			throw new Error('Invalid API params');
		}
		const responseText = await Requests.send({
			url: `${this.API_URL}/${this.apiParams.buildIdentifier}/viewingactivity?languages=en-US&authURL=${this.apiParams.authUrl}&pg=${this.nextHistoryPage}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as NetflixHistoryResponse;
		const responseItems = responseJson?.viewedItems ?? [];
		this.nextHistoryPage += 1;
		this.hasReachedHistoryEnd = responseItems.length === 0;
		return responseItems;
	}

	isNewHistoryItem(historyItem: NetflixHistoryItem, lastSync: number, lastSyncId: string) {
		return historyItem.date > 0 && Math.trunc(historyItem.date / 1e3) > lastSync;
	}

	async convertHistoryItems(historyItems: NetflixHistoryItem[]) {
		const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
		return historyItemsWithMetadata.map((historyItem) => this.parseHistoryItem(historyItem));
	}

	async getHistoryMetadata(historyItems: NetflixHistoryItem[]) {
		if (!this.checkParams(this.apiParams)) {
			throw new Error('Invalid API params');
		}
		let historyItemsWithMetadata: NetflixHistoryItemWithMetadata[] = [];
		const responseText = await Requests.send({
			url: `${this.API_URL}/${this.apiParams.buildIdentifier}/pathEvaluator?languages=en-US`,
			method: 'POST',
			body: `authURL=${this.apiParams.authUrl}&${historyItems
				.map((historyItem) => `path=["videos",${historyItem.movieID},["releaseYear","summary"]]`)
				.join('&')}`,
		});
		const responseJson = JSON.parse(responseText) as NetflixMetadataResponse;
		if (responseJson && responseJson.value.videos) {
			historyItemsWithMetadata = historyItems.map((historyItem) => {
				const metadata = responseJson.value.videos[historyItem.movieID];
				let combinedItem: NetflixHistoryItemWithMetadata;
				if (metadata) {
					combinedItem = Object.assign({}, historyItem, metadata);
				} else {
					combinedItem = historyItem as NetflixHistoryItemWithMetadata;
				}
				return combinedItem;
			});
		} else {
			throw responseText;
		}
		return historyItemsWithMetadata;
	}

	isShow(
		historyItem: NetflixHistoryItemWithMetadata
	): historyItem is NetflixHistoryShowItemWithMetadata {
		return 'series' in historyItem;
	}

	parseHistoryItem(historyItem: NetflixHistoryItemWithMetadata) {
		let item: Item;
		const serviceId = this.id;
		const id = historyItem.movieID.toString();
		const type = 'series' in historyItem ? 'show' : 'movie';
		const year = historyItem.releaseYear;
		const watchedAt = moment(historyItem.date + historyItem.duration * 1000);
		const progress = Math.ceil((historyItem.bookmark / historyItem.duration) * 100);
		if (this.isShow(historyItem)) {
			const title = historyItem.seriesTitle.trim();
			let season;
			let episode;
			const isCollection = !historyItem.seasonDescriptor.includes('Season');
			if (!isCollection) {
				// TODO: Some items don't have a summary response (see Friends pilot).
				season = historyItem.summary.season;
				episode = historyItem.summary.episode;
			}
			const episodeTitle = historyItem.episodeTitle.trim();
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
				watchedAt,
				progress,
			});
		} else {
			const title = historyItem.title.trim();
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				watchedAt,
				progress,
			});
		}
		return item;
	}

	async getItem(id: string): Promise<Item | null> {
		let item: Item | null = null;
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.checkParams(this.apiParams)) {
			throw new Error('Invalid API params');
		}
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/${this.apiParams.buildIdentifier}/metadata?languages=en-US&movieid=${id}`,
				method: 'GET',
			});
			item = this.parseMetadata(JSON.parse(responseText));
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: NetflixSingleMetadataItem): Item {
		let item: Item;
		const serviceId = this.id;
		const { video } = metadata;
		const id = video.id.toString();
		const { type, title, year } = video;
		if (video.type === 'show') {
			let episodeInfo: NetflixMetadataShowEpisode | undefined;
			const seasonInfo = video.seasons.find((currentSeason) =>
				currentSeason.episodes.find((currentEpisode) => {
					const isMatch = currentEpisode.id === video.currentEpisode;
					if (isMatch) {
						episodeInfo = currentEpisode;
					}
					return isMatch;
				})
			);
			if (!seasonInfo || !episodeInfo) {
				throw new Error('Could not find item');
			}
			const isCollection = seasonInfo.shortName.includes('C');
			let season;
			let episode;
			if (!isCollection) {
				season = seasonInfo.seq;
				episode = episodeInfo.seq;
			}
			const episodeTitle = episodeInfo.title;
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				season,
				episode,
				episodeTitle,
			});
		} else {
			item = new Item({ serviceId, id, type, title, year });
		}
		return item;
	}

	getApiParams(): Promise<Partial<NetflixApiParams> | null> {
		return ScriptInjector.inject<Partial<NetflixApiParams>>(this.id, 'api-params', '', () => {
			const apiParams: Partial<NetflixApiParams> = {};
			const { netflix } = window;
			if (netflix) {
				const authUrl = netflix.reactContext.models.userInfo.data.authURL;
				if (authUrl) {
					apiParams.authUrl = authUrl;
				}
				const buildIdentifier = netflix.reactContext.models.serverDefs.data.BUILD_IDENTIFIER;
				if (buildIdentifier) {
					apiParams.buildIdentifier = buildIdentifier;
				}
			}
			return apiParams;
		});
	}
}

export const NetflixApi = new _NetflixApi();
