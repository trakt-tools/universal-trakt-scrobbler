import { ServiceApi } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { Tv2PlayService } from '@/services/tv2-play/Tv2PlayService';
import { Utils } from '@common/Utils';
import { Shared } from '@common/Shared';
import { ScriptInjector } from '@common/ScriptInjector';

interface Asset {
	id: string;
	path: string;
	title: string;
}

interface Tv2PlayEpisodeHistoryItem {
	id: string;
	date: string;
	asset: Asset;
	season: Asset;
	show: Asset;
}

interface Tv2PlayMovieHistoryItem {
	id: string;
	date: string;
	asset: Asset;
	season: null;
	show: null;
}

export type Tv2PlayHistoryItem = Tv2PlayMovieHistoryItem | Tv2PlayEpisodeHistoryItem;

interface TV2PlayProgress {
	position?: number;
	duration: number;
	label: string;
	watched: number;
}

interface TV2PlaySeasonContent {
	title: string;
	long_title: string;
	id: string;
	self_uri: string;
	url: string;
}

interface TV2PlayEpisodeInCollection {
	content_id: string;
	title: string;
	url: string;
	description: string;
	progress?: TV2PlayProgress;
}

interface TV2PlaySeasonCollectionResponse {
	title: string;
	long_title: string;
	content: TV2PlayEpisodeInCollection[];
	id: string;
	self_uri: string;
	size: number;
	start: number;
	total: number;
	url: string;
	sort_order: string;
}

interface TV2PlayContentResponseBase {
	player: {
		content_id: string;
		title: string;
		url: string;
		asset_id: string;
		progress: TV2PlayProgress;
	};
	details: {
		title: string;
		description: string;
		content_id: string;
		image: string;
		metainfo?: Array<{ text: string; type?: string }>;
	};
}

interface TV2PlayEpisodeContentResponse extends TV2PlayContentResponseBase {
	layout: 'seasonal';
	seasons: {
		selected_index: number;
		content: TV2PlaySeasonContent[];
	};
}

interface TV2PlayMovieContentResponse extends TV2PlayContentResponseBase {
	layout: 'movie';
}

type TV2PlayContentResponse = TV2PlayEpisodeContentResponse | TV2PlayMovieContentResponse;

interface TV2PlayUserInfo {
	email: string;
	firstname: string;
	lastname: string;
}

interface Auth0TokenData {
	body: {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
		token_type: string;
	};
	expiresAt: number;
}

interface Tv2PlaySession {
	accessToken: string;
	refreshToken?: string;
}

class _Tv2PlayApi extends ServiceApi {
	HISTORY_URL: string;
	TOKEN_URL: string;
	PROFILE_URL: string;
	token: string;
	isActivated: boolean;
	pageSize = 10;

	authRequests = Requests;

	// Cache for season collections to avoid duplicate API calls
	private seasonCollectionCache = new Map<string, TV2PlaySeasonCollectionResponse>();

	constructor() {
		super(Tv2PlayService.id);
		this.HISTORY_URL = 'https://ai.play.tv2.no/v4/viewinghistory/?start=0&size=10';
		this.TOKEN_URL = 'https://id.tv2.no/oauth/token';
		this.PROFILE_URL = 'https://api.play.tv2.no/user/';
		this.token = '';
		this.isActivated = false;
	}

	async activate() {
		// Get the Auth0 token from localStorage via script injection
		const sessionData = await ScriptInjector.inject<Tv2PlaySession>(
			Tv2PlayService.id,
			'session',
			'https://play.tv2.no'
		);

		if (!sessionData || !sessionData.accessToken) {
			throw new Error('Could not retrieve Auth0 access token from TV2 Play');
		}

		this.token = sessionData.accessToken;

		this.authRequests = withHeaders({
			Authorization: `Bearer ${this.token}`,
		});

		// Fetch user profile to get the profile name
		const profileData = await this.authRequests.send({
			url: this.PROFILE_URL,
			method: 'GET',
		});
		const profile = JSON.parse(profileData) as TV2PlayUserInfo;
		this.session = {
			profileName: profile.firstname + ' ' + profile.lastname,
		};
		this.isActivated = true;
	}
	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(): Promise<Tv2PlayHistoryItem[]> {
		if (!this.isActivated) {
			await this.activate();
		}

		// Retrieve the history items
		const responseText = await this.authRequests.send({
			url: `https://ai.play.tv2.no/v4/viewinghistory/?start=${
				this.nextHistoryPage * this.pageSize
			}&size=${this.pageSize}`,
			method: 'GET',
		});
		const historyItems = JSON.parse(responseText) as Tv2PlayHistoryItem[];

		this.nextHistoryPage += 1;
		// Check if it has reached the history end
		this.hasReachedHistoryEnd = historyItems.length === 0;

		return historyItems;
	}

	isNewHistoryItem(historyItem: Tv2PlayHistoryItem, lastSync: number, lastSyncId: string) {
		return new Date(historyItem.date).getTime() > lastSync;
	}

	getHistoryItemId(historyItem: Tv2PlayHistoryItem) {
		return historyItem.id.toString();
	}

	async convertHistoryItems(historyItems: Tv2PlayHistoryItem[]) {
		const promises = historyItems.map(async (historyItem) => {
			// Fetch content info (progress, year, and episode title for episodes)
			let contentInfo;
			try {
				contentInfo = await this.getProgressForItem(historyItem.asset.path);
			} catch (error) {
				console.error('Failed to get progress for item:', historyItem.asset.path, error);
				// contentInfo will remain undefined
			}

			const item = await this.parseHistoryItemWithTitle(historyItem, contentInfo?.contentResponse);

			await this.updateItemFromHistory(item, historyItem, contentInfo);
			return item;
		});

		return Promise.all(promises);
	}

	parseYearFromMetainfo(metainfo?: Array<{ text: string; type?: string }>): number {
		if (!metainfo) return 0;

		// Look for a 4-digit year (19xx or 20xx) in metainfo
		for (const info of metainfo) {
			const yearMatch = info.text.match(/^(?:19|20)\d{2}$/);
			if (yearMatch) {
				return parseInt(yearMatch[0], 10);
			}
		}
		return 0;
	}

	async getProgressForItem(path: string): Promise<{
		progress: TV2PlayProgress | null;
		year: number;
		contentResponse?: TV2PlayContentResponse;
	}> {
		if (!this.isActivated) {
			await this.activate();
		}

		try {
			const responseText = await this.authRequests.send({
				url: `https://ai.play.tv2.no/v4/content/path${path}`,
				method: 'GET',
			});
			const responseJson = JSON.parse(responseText) as TV2PlayContentResponse;

			return {
				progress: responseJson.player.progress,
				year: this.parseYearFromMetainfo(responseJson.details.metainfo),
				contentResponse: responseJson,
			};
		} catch (error) {
			console.error('Failed to fetch progress for item:', path, error);
			return { progress: null, year: 0 };
		}
	}

	async parseHistoryItemWithTitle(
		historyItem: Tv2PlayHistoryItem,
		contentResponse?: TV2PlayContentResponse
	): Promise<ScrobbleItem> {
		// Check if it's an episode by looking for season info
		if (historyItem.season && historyItem.season.title) {
			const seasonMatch = historyItem.season.title.match(/\d+/);
			const seasonNumber = seasonMatch ? parseInt(seasonMatch[0], 10) : 0;

			// Parse episode number from path like "/serier/nepobaby-e6rrt3cb/sesong-1/episode-1"
			const episodeMatch = historyItem.asset.path.match(/episode-(?<episode>\d+)/i);
			const episodeNumber = episodeMatch?.groups?.episode
				? parseInt(episodeMatch.groups.episode, 10)
				: 0;

			// Try to get episode title from content response (with caching and cleanup)
			let episodeTitle = `Episode ${episodeNumber}`; // Fallback
			if (contentResponse) {
				const fetchedTitle = await this.getEpisodeTitleFromCollection(
					contentResponse,
					historyItem.asset.id,
					episodeNumber
				);
				if (fetchedTitle) {
					episodeTitle = fetchedTitle;
				}
			}

			const values = {
				serviceId: this.id,
				id: historyItem.asset.id,
				title: episodeTitle,
				season: seasonNumber,
				number: episodeNumber,
				show: {
					serviceId: this.id,
					id: historyItem.show.id,
					title: historyItem.show.title,
				},
			};
			return new EpisodeItem(values);
		}

		// Otherwise, treat it as a movie
		return new MovieItem({
			serviceId: this.id,
			id: historyItem.asset.id,
			title: historyItem.asset.title,
		});
	}

	updateItemFromHistory(
		item: ScrobbleItemValues,
		historyItem: Tv2PlayHistoryItem,
		contentInfo?: { progress: TV2PlayProgress | null; year: number }
	): Promisable<void> {
		item.watchedAt = historyItem.date ? Utils.unix(historyItem.date) : undefined;

		// Use the watched percentage directly from the API
		if (contentInfo?.progress && typeof contentInfo.progress.watched === 'number') {
			item.progress = contentInfo.progress.watched;
		} else {
			// Fallback to 100 if progress information is not available
			item.progress = 100;
		}

		// Set year for movies
		if (item.type === 'movie' && contentInfo?.year && contentInfo.year > 0) {
			item.year = contentInfo.year;
		}
	}

	async getItem(path: string): Promise<ScrobbleItem> {
		if (!this.isActivated) {
			await this.activate();
		}

		const responseText = await this.authRequests.send({
			url: `https://ai.play.tv2.no/v4/content/path${path}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as TV2PlayContentResponse;
		if (responseJson.layout === 'seasonal') {
			// Parse season and episode numbers from the URL
			const episodeMatch = path.match(/\/sesong-(?<season>\d+)\/episode-(?<episode>\d+)/i);
			const seasonNumber = episodeMatch?.groups?.season
				? parseInt(episodeMatch.groups.season, 10)
				: 0;
			const episodeNumber = episodeMatch?.groups?.episode
				? parseInt(episodeMatch.groups.episode, 10)
				: 0;

			// Fetch episode title from season collection (with caching and cleanup)
			let episodeTitle = `Episode ${episodeNumber}`; // Fallback
			const fetchedTitle = await this.getEpisodeTitleFromCollection(
				responseJson,
				responseJson.player.asset_id,
				episodeNumber
			);
			if (fetchedTitle) {
				episodeTitle = fetchedTitle;
			}

			const values = {
				serviceId: this.id,
				id: responseJson.player.asset_id,
				title: episodeTitle,
				season: seasonNumber,
				number: episodeNumber,
				show: {
					serviceId: this.id,
					id: responseJson.details.content_id,
					title: responseJson.details.title,
				},
			};
			return new EpisodeItem(values);
		}

		const year = this.parseYearFromMetainfo(responseJson.details.metainfo);
		return new MovieItem({
			serviceId: this.id,
			id: responseJson.player.asset_id,
			title: responseJson.details.title,
			year,
		});
	}

	/**
	 * Strip episode number prefix from episode titles
	 * Examples: "1. Title" -> "Title", "1. – Title" -> "Title"
	 */
	cleanEpisodeTitle(title: string, episodeNumber: number): string {
		// Remove patterns like "1. ", "1. – ", "01. ", etc.
		const patterns = [
			new RegExp(`^0*${episodeNumber}\\.\\s*–\\s*`, 'i'), // "1. – "
			new RegExp(`^0*${episodeNumber}\\.\\s*`, 'i'), // "1. "
		];

		for (const pattern of patterns) {
			const cleaned = title.replace(pattern, '');
			if (cleaned !== title) {
				return cleaned;
			}
		}

		return title;
	}

	/**
	 * Fetch episode details from season collection with caching
	 */
	async getEpisodeFromCollection(
		collectionUri: string,
		episodeId: string
	): Promise<TV2PlayEpisodeInCollection | null> {
		if (!this.isActivated) {
			await this.activate();
		}

		try {
			// Check cache first
			let collectionData = this.seasonCollectionCache.get(collectionUri);

			if (!collectionData) {
				// Cache miss - fetch from API
				const responseText = await this.authRequests.send({
					url: `https://ai.play.tv2.no${collectionUri}?size=100&start=0`,
					method: 'GET',
				});
				collectionData = JSON.parse(responseText) as TV2PlaySeasonCollectionResponse;

				// Store in cache
				this.seasonCollectionCache.set(collectionUri, collectionData);
			}

			// Find the episode by content_id
			const episode = collectionData.content.find((ep) => ep.content_id === episodeId);
			return episode || null;
		} catch (error) {
			console.error('Failed to fetch collection:', collectionUri, error);
			return null;
		}
	}

	/**
	 * Fetch episode title from season collection
	 * Handles caching and title cleanup
	 */
	async getEpisodeTitleFromCollection(
		contentResponse: TV2PlayContentResponse,
		episodeId: string,
		episodeNumber: number
	): Promise<string | null> {
		if (contentResponse.layout !== 'seasonal' || !contentResponse.seasons) {
			return null;
		}

		try {
			const selectedSeason =
				contentResponse.seasons.content[contentResponse.seasons.selected_index];
			if (!selectedSeason?.self_uri) {
				return null;
			}

			const episodeDetails = await this.getEpisodeFromCollection(
				selectedSeason.self_uri,
				episodeId
			);

			if (episodeDetails) {
				// Clean up the title (remove episode number prefix)
				return this.cleanEpisodeTitle(episodeDetails.title, episodeNumber);
			}
		} catch (error) {
			console.error('Failed to fetch episode title from collection:', error);
		}

		return null;
	}
}

// Inject this function into the TV2 Play page to retrieve the Auth0 token from localStorage
Shared.functionsToInject[`${Tv2PlayService.id}-session`] = (): Tv2PlaySession | null => {
	const auth0Key = Object.keys(window.localStorage).find((key) => key.startsWith('@@auth0spajs@@'));

	if (!auth0Key) {
		return null;
	}

	try {
		const auth0DataStr = window.localStorage.getItem(auth0Key);
		if (!auth0DataStr) {
			return null;
		}

		const auth0Data = JSON.parse(auth0DataStr) as Auth0TokenData;

		if (!auth0Data.body?.access_token) {
			return null;
		}

		return {
			accessToken: auth0Data.body.access_token,
			refreshToken: auth0Data.body.refresh_token,
		};
	} catch (error) {
		return null;
	}
};

export const Tv2PlayApi = new _Tv2PlayApi();
