import { NetflixService } from '@/netflix/NetflixService';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';

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
					name: string | null;
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

export interface NetflixSession extends ServiceApiSession {
	authUrl: string;
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

export type NetflixHistoryItem = NetflixHistoryEpisodeItem | NetflixHistoryMovieItem;

export interface NetflixHistoryEpisodeItem {
	bookmark: number;
	date: number;
	duration: number;
	episodeTitle: string;
	movieID: number;
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
		seasons?: Record<string, NetflixMetadataSeasonItem>;
		videos: Record<string, NetflixMetadataItem>;
	};
}

export type NetflixMetadataItem =
	| NetflixMetadataEpisodeItem
	| NetflixMetadataShowItem
	| NetflixMetadataMovieItem;

export interface NetflixMetadataEpisodeItem {
	releaseYear: number;
	summary: {
		episode: number;
		id: number;
		season: number;
	};
}

export interface NetflixMetadataSeasonItem {
	summary: {
		hiddenEpisodeNumbers: boolean;
	};
}

export type NetflixMetadataEpisodeItemWithSeason = NetflixMetadataEpisodeItem & {
	season?: NetflixMetadataSeasonItem;
};

export interface NetflixMetadataShowItem {
	seasonList: {
		current: ['seasons', string];
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
	hiddenEpisodeNumbers: boolean;
	seasons: NetflixMetadataShowSeason[];
};

export interface NetflixMetadataShowSeason {
	episodes: NetflixMetadataShowEpisode[];
	seq: number;
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
	| NetflixHistoryEpisodeItemWithMetadata
	| NetflixHistoryMovieItemWithMetadata;

export type NetflixHistoryEpisodeItemWithMetadata = NetflixHistoryEpisodeItem &
	NetflixMetadataEpisodeItemWithSeason;

export type NetflixHistoryMovieItemWithMetadata = NetflixHistoryMovieItem &
	NetflixMetadataMovieItem;

class _NetflixApi extends ServiceApi {
	HOST_URL: string;
	API_URL: string;
	ACTIVATE_URL: string;
	isActivated: boolean;
	session: NetflixSession | null = null;

	constructor() {
		super(NetflixService.id);

		this.HOST_URL = 'https://www.netflix.com';
		this.API_URL = `${this.HOST_URL}/api/shakti`;
		this.ACTIVATE_URL = `${this.HOST_URL}/settings/viewed/`;

		this.isActivated = false;
	}

	async activate() {
		// If we can access the global netflix object from the page, there is no need to send a request to Netflix in order to retrieve the session.
		try {
			this.session = await this.getSession();
			if (!this.session) {
				const responseText = await Requests.send({
					url: this.ACTIVATE_URL,
					method: 'GET',
				});
				this.session = this.extractSession(responseText);
			}
			if (this.session?.profileName != null) {
				this.isActivated = true;
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log(`Failed to activate ${this.id} API`, err);
			}
			throw new Error('Failed to activate API');
		}
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return this.session?.profileName != null;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<NetflixHistoryItem[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.session) {
			throw new Error('Invalid session');
		}
		const responseText = await Requests.send({
			url: `${this.API_URL}/mre/viewingactivity?languages=en-US&authURL=${this.session.authUrl}&pg=${this.nextHistoryPage}`,
			method: 'GET',
			cancelKey,
		});
		const responseJson = JSON.parse(responseText) as NetflixHistoryResponse;
		const responseItems = responseJson?.viewedItems ?? [];
		this.nextHistoryPage += 1;
		this.hasReachedHistoryEnd = responseItems.length === 0;
		return responseItems;
	}

	isNewHistoryItem(historyItem: NetflixHistoryItem, lastSync: number) {
		return historyItem.date > 0 && Utils.unix(historyItem.date) > lastSync;
	}

	getHistoryItemId(historyItem: NetflixHistoryItem) {
		return historyItem.movieID.toString();
	}

	async convertHistoryItems(historyItems: NetflixHistoryItem[]) {
		const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
		return historyItemsWithMetadata.map((historyItem) => this.parseHistoryItem(historyItem));
	}

	updateItemFromHistory(
		item: ScrobbleItemValues,
		historyItem: NetflixHistoryItem
	): Promisable<void> {
		item.watchedAt = Utils.unix(historyItem.date);
		item.progress = Math.ceil((historyItem.bookmark / historyItem.duration) * 100);
	}

	async getHistoryMetadata(historyItems: NetflixHistoryItem[]) {
		if (!this.session) {
			throw new Error('Invalid session');
		}
		let historyItemsWithMetadata: NetflixHistoryItemWithMetadata[] = [];

		const paths = historyItems.map(
			(historyItem) => `path=["videos",${historyItem.movieID},["releaseYear","summary"]]`
		);

		// In order to have `hiddenEpisodeNumbers` available in the response,
		// we need to request the summary for the current season of each unique show in the history
		paths.push(
			...Array.from(
				new Set(
					(
						historyItems.filter(
							(historyItem) => 'series' in historyItem
						) as NetflixHistoryEpisodeItem[]
					).map((historyItem) => historyItem.series)
				)
			).map((seriesId) => `path=["videos",${seriesId},"seasonList","current","summary"]`)
		);

		const responseText = await Requests.send({
			url: `${this.API_URL}/mre/pathEvaluator?languages=en-US`,
			method: 'POST',
			body: `authURL=${this.session.authUrl}&${paths.join('&')}`,
		});
		const responseJson = JSON.parse(responseText) as NetflixMetadataResponse;
		if (responseJson && responseJson.value.videos) {
			historyItemsWithMetadata = historyItems.map((historyItem) => {
				const metadata = responseJson.value.videos[historyItem.movieID];
				let combinedItem: NetflixHistoryItemWithMetadata;
				if (metadata && !('seasonList' in metadata)) {
					combinedItem = Object.assign({}, historyItem, metadata);

					// We lookup the current season metadata using the show metadata
					// and assign it to the `season` prop in `NetflixHistoryItemWithMetadata`
					if (responseJson.value.seasons && 'series' in historyItem && historyItem.series) {
						const showMetadata = responseJson.value.videos[historyItem.series];
						if (showMetadata && 'seasonList' in showMetadata && showMetadata.seasonList) {
							const seasonMetadata = responseJson.value.seasons[showMetadata.seasonList.current[1]];
							if (seasonMetadata) {
								combinedItem = Object.assign({}, combinedItem, {
									season: seasonMetadata,
								});
							}
						}
					}
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
	): historyItem is NetflixHistoryEpisodeItemWithMetadata {
		return 'series' in historyItem;
	}

	parseHistoryItem(historyItem: NetflixHistoryItemWithMetadata) {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const id = historyItem.movieID.toString();
		const year = historyItem.releaseYear;
		const watchedAt = Utils.unix(historyItem.date);
		const progress = Math.ceil((historyItem.bookmark / historyItem.duration) * 100);
		if (this.isShow(historyItem)) {
			const title = historyItem.seriesTitle.trim();

			let season = 0;
			let number = 0;

			// `hiddenEpisodeNumbers` is `true` for collections
			// In this case, the episode should be searched by title instead of season and number,
			// because the numbering differs between Netflix and Trakt.tv for collections
			if (historyItem.season?.summary.hiddenEpisodeNumbers === false) {
				season = historyItem.summary?.season || 0;
				number = historyItem.summary?.episode || 0;
			}

			const episodeTitle = historyItem.episodeTitle.trim();
			item = new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				year,
				season,
				number,
				watchedAt,
				progress,
				show: {
					serviceId,
					title,
					year,
				},
			});
		} else {
			const title = historyItem.title.trim();
			item = new MovieItem({
				serviceId,
				id,
				title,
				year,
				watchedAt,
				progress,
			});
		}
		return item;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		let item: ScrobbleItem | null = null;
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.session) {
			throw new Error('Invalid session');
		}
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/mre/metadata?languages=en-US&movieid=${id}`,
				method: 'GET',
			});
			item = this.parseMetadata(JSON.parse(responseText) as NetflixSingleMetadataItem);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: NetflixSingleMetadataItem): ScrobbleItem {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const { video } = metadata;
		const { type, title, year } = video;
		if (type === 'show') {
			const id = video.currentEpisode.toString();
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

			let season = 0;
			let number = 0;

			// `hiddenEpisodeNumbers` is `true` for collections
			// In this case, the episode should be searched by title instead of season and number,
			// because the numbering differs between Netflix and Trakt.tv for collections
			if (!video.hiddenEpisodeNumbers) {
				season = seasonInfo.seq || 0;
				number = episodeInfo.seq || 0;
			}

			const episodeTitle = episodeInfo.title;
			item = new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				year,
				season,
				number,
				show: {
					serviceId,
					id: video.id.toString(),
					title,
				},
			});
		} else {
			const id = video.id.toString();
			item = new MovieItem({
				serviceId,
				id,
				title,
				year,
			});
		}
		return item;
	}

	getSession(): Promise<NetflixSession | null> {
		return ScriptInjector.inject<NetflixSession>(this.id, 'session', '');
	}

	extractSession(text: string): NetflixSession | null {
		let session: NetflixSession | null = null;
		const authUrlRegex = /"authURL":"(?<authUrl>.*?)"/;
		const profileNameRegex = /"userInfo":\{"name":"(?<profileName>.*?)"/;
		const { authUrl } = authUrlRegex.exec(text)?.groups ?? {};
		const { profileName = null } = profileNameRegex.exec(text)?.groups ?? {};
		if (authUrl) {
			session = { authUrl, profileName };
		}
		return session;
	}
}

Shared.functionsToInject[`${NetflixService.id}-session`] = () => {
	let session: NetflixSession | null = null;
	const { netflix } = window;
	if (netflix) {
		const { userInfo } = netflix.reactContext.models;
		const authUrl = userInfo.data.authURL;
		const profileName = userInfo.data.name;
		if (authUrl) {
			session = { authUrl, profileName };
		}
	}
	return session;
};

export const NetflixApi = new _NetflixApi();
