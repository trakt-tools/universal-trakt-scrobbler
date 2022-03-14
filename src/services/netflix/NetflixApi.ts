import { NetflixService } from '@/netflix/NetflixService';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Item } from '@models/Item';

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
	isActivated: boolean;
	session: NetflixSession | null = null;

	constructor() {
		super(NetflixService.id);

		this.HOST_URL = 'https://www.netflix.com';
		this.API_URL = `${this.HOST_URL}/api/shakti`;
		this.ACTIVATE_URL = `${this.HOST_URL}/Activate`;

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
			if (this.session) {
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
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(): Promise<NetflixHistoryItem[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.session) {
			throw new Error('Invalid session');
		}
		const responseText = await Requests.send({
			url: `${this.API_URL}/${this.session.buildIdentifier}/viewingactivity?languages=en-US&authURL=${this.session.authUrl}&pg=${this.nextHistoryPage}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as NetflixHistoryResponse;
		const responseItems = responseJson?.viewedItems ?? [];
		this.nextHistoryPage += 1;
		this.hasReachedHistoryEnd = responseItems.length === 0;
		return responseItems;
	}

	isNewHistoryItem(historyItem: NetflixHistoryItem, lastSync: number, lastSyncId: string) {
		return historyItem.date > 0 && Utils.unix(historyItem.date) > lastSync;
	}

	getHistoryItemId(historyItem: NetflixHistoryItem) {
		return historyItem.movieID.toString();
	}

	async convertHistoryItems(historyItems: NetflixHistoryItem[]) {
		const historyItemsWithMetadata = await this.getHistoryMetadata(historyItems);
		return historyItemsWithMetadata.map((historyItem) => this.parseHistoryItem(historyItem));
	}

	async getHistoryMetadata(historyItems: NetflixHistoryItem[]) {
		if (!this.session) {
			throw new Error('Invalid session');
		}
		let historyItemsWithMetadata: NetflixHistoryItemWithMetadata[] = [];
		const responseText = await Requests.send({
			url: `${this.API_URL}/${this.session.buildIdentifier}/pathEvaluator?languages=en-US`,
			method: 'POST',
			body: `authURL=${this.session.authUrl}&${historyItems
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
		const watchedAt = Utils.unix(historyItem.date);
		const progress = Math.ceil((historyItem.bookmark / historyItem.duration) * 100);
		if (this.isShow(historyItem)) {
			const title = historyItem.seriesTitle.trim();
			let season;
			let episode;
			const isCollection = !historyItem.seasonDescriptor.includes('Season');
			if (!isCollection && historyItem.summary) {
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
		if (!this.session) {
			throw new Error('Invalid session');
		}
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/${this.session.buildIdentifier}/metadata?languages=en-US&movieid=${id}`,
				method: 'GET',
			});
			item = this.parseMetadata(JSON.parse(responseText));
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
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

	getSession(): Promise<NetflixSession | null> {
		return ScriptInjector.inject<NetflixSession>(this.id, 'session', '', () => {
			let session: NetflixSession | null = null;
			const { netflix } = window;
			if (netflix) {
				const { userInfo, serverDefs } = netflix.reactContext.models;
				const authUrl = userInfo.data.authURL;
				const buildIdentifier = serverDefs.data.BUILD_IDENTIFIER;
				const profileName = userInfo.data.name;
				if (authUrl && buildIdentifier) {
					session = { authUrl, buildIdentifier, profileName };
				}
			}
			return session;
		});
	}

	extractSession(text: string): NetflixSession | null {
		let session: NetflixSession | null = null;
		const authUrlRegex = /"authURL":"(?<authUrl>.*?)"/;
		const buildIdentifierRegex = /"BUILD_IDENTIFIER":"(?<buildIdentifier>.*?)"/;
		const profileNameRegex = /"userInfo":\{"name":"(?<profileName>.*?)"/;
		const { authUrl } = authUrlRegex.exec(text)?.groups ?? {};
		const { buildIdentifier } = buildIdentifierRegex.exec(text)?.groups ?? {};
		const { profileName = null } = profileNameRegex.exec(text)?.groups ?? {};
		if (authUrl && buildIdentifier) {
			session = { authUrl, buildIdentifier, profileName };
		}
		return session;
	}
}

export const NetflixApi = new _NetflixApi();
