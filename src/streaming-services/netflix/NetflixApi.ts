import * as moment from 'moment';
import { Errors } from '../../common/Errors';
import { EventDispatcher } from '../../common/Events';
import { RequestException, Requests } from '../../common/Requests';
import { Shared } from '../../common/Shared';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

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

class _NetflixApi extends Api {
	HOST_URL: string;
	API_URL: string;
	ACTIVATE_URL: string;
	AUTH_REGEX: RegExp;
	BUILD_IDENTIFIER_REGEX: RegExp;
	isActivated: boolean;
	apiParams: Partial<NetflixApiParams>;
	hasInjectedApiParamsScript: boolean;
	hasInjectedSessionScript: boolean;
	apiParamsListener: ((event: Event) => void) | undefined;
	sessionListener: ((event: Event) => void) | undefined;

	constructor() {
		super('netflix');

		this.HOST_URL = 'https://www.netflix.com';
		this.API_URL = `${this.HOST_URL}/api/shakti`;
		this.ACTIVATE_URL = `${this.HOST_URL}/Activate`;
		this.AUTH_REGEX = /"authURL":"(.*?)"/;
		this.BUILD_IDENTIFIER_REGEX = /"BUILD_IDENTIFIER":"(.*?)"/;

		this.isActivated = false;
		this.apiParams = {};
		this.hasInjectedApiParamsScript = false;
		this.hasInjectedSessionScript = false;
	}

	extractAuthUrl = (text: string): string | undefined => {
		return this.AUTH_REGEX.exec(text)?.[1];
	};

	extractBuildIdentifier = (text: string): string | undefined => {
		return this.BUILD_IDENTIFIER_REGEX.exec(text)?.[1];
	};

	activate = async () => {
		// If we can access the global netflix object from the page, there is no need to send a request to Netflix in order to retrieve the API params.
		let apiParams;
		if (Shared.pageType === 'content') {
			apiParams = await this.getApiParams();
		}
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
	};

	checkParams = (apiParams: Partial<NetflixApiParams>): apiParams is NetflixApiParams => {
		return (
			typeof apiParams.authUrl !== 'undefined' && typeof apiParams.buildIdentifier !== 'undefined'
		);
	};

	loadHistory = async (itemsToLoad: number, lastSync: number, lastSyncId: string) => {
		try {
			if (!this.isActivated) {
				await this.activate();
			}
			if (!this.checkParams(this.apiParams)) {
				throw new Error('Invalid API params');
			}
			const store = getSyncStore('netflix');
			let { nextPage, hasReachedEnd } = store.data;
			let items: Item[] = [];
			const historyItems: NetflixHistoryItem[] = [];
			do {
				const responseText = await Requests.send({
					url: `${this.API_URL}/${this.apiParams.buildIdentifier}/viewingactivity?languages=en-US&authURL=${this.apiParams.authUrl}&pg=${nextPage}`,
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as NetflixHistoryResponse;
				if (responseJson && responseJson.viewedItems.length > 0) {
					let filteredItems = [];
					if (lastSync > 0) {
						for (const viewedItem of responseJson.viewedItems) {
							if (viewedItem.date && Math.trunc(viewedItem.date / 1e3) > lastSync) {
								filteredItems.push(viewedItem);
							} else {
								break;
							}
						}
						if (filteredItems.length !== responseJson.viewedItems.length) {
							hasReachedEnd = true;
						}
					} else {
						filteredItems = responseJson.viewedItems;
					}
					itemsToLoad -= filteredItems.length;
					historyItems.push(...filteredItems);
				} else {
					hasReachedEnd = true;
				}
				nextPage += 1;
			} while (!hasReachedEnd && itemsToLoad > 0);
			if (historyItems.length > 0) {
				const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
				items = historyItemsWithMetadata.map(this.parseHistoryItem);
			}
			store.setData({ items, nextPage, hasReachedEnd });
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to load Netflix history.', err);
				await EventDispatcher.dispatch('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, {
					error: err as Error,
				});
			}
			throw err;
		}
	};

	getHistoryMetadata = async (historyItems: NetflixHistoryItem[]) => {
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
	};

	isShow = (
		historyItem: NetflixHistoryItemWithMetadata
	): historyItem is NetflixHistoryShowItemWithMetadata => {
		return 'series' in historyItem;
	};

	parseHistoryItem = (historyItem: NetflixHistoryItemWithMetadata) => {
		let item: Item;
		const serviceId = this.id;
		const id = historyItem.movieID.toString();
		const type = 'series' in historyItem ? 'show' : 'movie';
		const year = historyItem.releaseYear;
		const watchedAt = moment(historyItem.date + historyItem.duration * 1000);
		const percentageWatched = Math.ceil((historyItem.bookmark / historyItem.duration) * 100);
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
				isCollection,
				watchedAt,
				percentageWatched,
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
				percentageWatched,
			});
		}
		return item;
	};

	getItem = async (id: string): Promise<Item | undefined> => {
		let item: Item | undefined;
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
	};

	parseMetadata = (metadata: NetflixSingleMetadataItem): Item => {
		let item: Item;
		const serviceId = this.id;
		const { video } = metadata;
		const id = video.id.toString();
		const { type, title, year } = video;
		if (video.type === 'show') {
			let episodeInfo: NetflixMetadataShowEpisode | undefined;
			const seasonInfo = video.seasons.find((season) =>
				season.episodes.find((episode) => {
					const isMatch = episode.id === video.currentEpisode;
					if (isMatch) {
						episodeInfo = episode;
					}
					return isMatch;
				})
			);
			if (!seasonInfo || !episodeInfo) {
				throw new Error('Could not find item');
			}
			const isCollection = seasonInfo.shortName.includes('C');
			const season = seasonInfo.seq;
			const episode = episodeInfo.seq;
			const episodeTitle = episodeInfo.title;
			item = new Item({
				serviceId,
				id,
				type,
				title,
				year,
				isCollection,
				season,
				episode,
				episodeTitle,
			});
		} else {
			item = new Item({ serviceId, id, type, title, year });
		}
		return item;
	};

	getApiParams = (): Promise<Partial<NetflixApiParams>> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global netflix object by unwrapping it.
				const apiParams: Partial<NetflixApiParams> = {};
				const { netflix } = window.wrappedJSObject;
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
				resolve(apiParams);
			} else {
				// Chrome does not allow accessing page objects from extensions, so we need to inject a script into the page and exchange messages in order to access the global netflix object.
				if (!this.hasInjectedApiParamsScript) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-getApiParams', () => {
							let apiParams = {};
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
							const event = new CustomEvent('uts-onApiParamsReceived', {
								detail: { apiParams: JSON.stringify(apiParams) },
							});
							window.dispatchEvent(event);
						});
					`;
					document.body.appendChild(script);
					this.hasInjectedApiParamsScript = true;
				}
				if (this.apiParamsListener) {
					window.removeEventListener('uts-onApiParamsReceived', this.apiParamsListener);
				}
				this.apiParamsListener = (event: Event) =>
					resolve(
						JSON.parse(
							(event as CustomEvent<Record<'apiParams', string>>).detail.apiParams
						) as Partial<NetflixApiParams>
					);
				window.addEventListener('uts-onApiParamsReceived', this.apiParamsListener, false);
				const event = new CustomEvent('uts-getApiParams');
				window.dispatchEvent(event);
			}
		});
	};

	getSession = (): Promise<NetflixScrobbleSession | undefined | null> => {
		return new Promise((resolve) => {
			if ('wrappedJSObject' in window && window.wrappedJSObject) {
				// Firefox wraps page objects, so we can access the global netflix object by unwrapping it.
				let session: NetflixScrobbleSession | undefined | null;
				const { netflix } = window.wrappedJSObject;
				if (netflix) {
					const sessions = netflix.appContext.state.playerApp.getState().videoPlayer
						.playbackStateBySessionId;
					const currentId = Object.keys(sessions).find((id) => id.startsWith('watch'));
					session = currentId ? sessions[currentId] : undefined;
				}
				resolve(session);
			} else {
				// Chrome does not allow accessing page objects from extensions, so we need to inject a script into the page and exchange messages in order to access the global netflix object.
				if (!this.hasInjectedSessionScript) {
					const script = document.createElement('script');
					script.textContent = `
						window.addEventListener('uts-getSession', () => {
							let session;
							if (netflix) {
								const sessions = netflix.appContext.state.playerApp.getState().videoPlayer.playbackStateBySessionId;
								const currentId = Object.keys(sessions)
									.find(id => id.startsWith('watch'));
								session = currentId ? sessions[currentId] : undefined;
							}
							const event = new CustomEvent('uts-onSessionReceived', {
								detail: { session: JSON.stringify(session) },
							});
							window.dispatchEvent(event);
						});
					`;
					document.body.appendChild(script);
					this.hasInjectedSessionScript = true;
				}
				if (this.sessionListener) {
					window.removeEventListener('uts-onSessionReceived', this.sessionListener);
				}
				this.sessionListener = (event: Event) => {
					const session = (event as CustomEvent<Record<'session', string | undefined>>).detail
						.session;
					if (typeof session === 'undefined') {
						resolve(session);
					} else {
						resolve(JSON.parse(session) as NetflixScrobbleSession | null);
					}
				};
				window.addEventListener('uts-onSessionReceived', this.sessionListener, false);
				const event = new CustomEvent('uts-getSession');
				window.dispatchEvent(event);
			}
		});
	};
}

export const NetflixApi = new _NetflixApi();

registerApi('netflix', NetflixApi);
