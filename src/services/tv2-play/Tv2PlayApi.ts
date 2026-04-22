import { ServiceApi } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { Tv2PlayService } from '@/services/tv2-play/Tv2PlayService';
import { Utils } from '@common/Utils';
import { Shared } from '@common/Shared';
import { ScriptInjector } from '@common/ScriptInjector';

interface HistoryAsset {
	path: string;
	title: string;
}

interface Tv2PlayEpisodeHistoryItem {
	id: string;
	date: string;
	asset: HistoryAsset;
	season: HistoryAsset;
	show: HistoryAsset;
}

interface Tv2PlayMovieHistoryItem {
	id: string;
	date: string;
	asset: HistoryAsset;
	season: null;
	show: null;
}

export type Tv2PlayHistoryItem = Tv2PlayMovieHistoryItem | Tv2PlayEpisodeHistoryItem;

// Content API response types
interface TV2PlayProgress {
	position?: number;
	duration: number;
	watched: number;
}

interface TV2PlayContentResponse {
	layout: 'seasonal' | 'movie' | 'plain'; // seasonal=series, movie=film, plain=sport
	player: {
		content_id: string;
		asset_id: string;
		title: string; // Show title, NOT episode title
		progress: TV2PlayProgress;
		// Episode title is in metainfo[1].text (metainfo[0] is "S1E2" format)
		metainfo?: Array<{ text: string }>;
	};
	details: {
		content_id: string;
		title: string;
		image: { src: string };
		// Used to parse year for movies
		metainfo?: Array<{ text: string; type?: string }>;
	};
}

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

	isNewHistoryItem(historyItem: Tv2PlayHistoryItem, lastSync: number, _lastSyncId: string) {
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
		// Check if it's an episode by looking for season info AND show info
		// Also verify the path contains /serier/ to exclude sports content
		const isSeriesPath = historyItem.asset.path.startsWith('/serier/');
		if (isSeriesPath && historyItem.season && historyItem.season.title && historyItem.show) {
			const seasonMatch = historyItem.season.title.match(/\d+/);
			const seasonNumber = seasonMatch ? parseInt(seasonMatch[0], 10) : 0;

			// Parse episode number from path like "/serier/nepobaby-e6rrt3cb/sesong-1/episode-1"
			const episodeMatch = historyItem.asset.path.match(/episode-(?<episode>\d+)/i);
			const episodeNumber = episodeMatch?.groups?.episode
				? parseInt(episodeMatch.groups.episode, 10)
				: 0;

			// Use historyItem.id as the identifier (asset.id was removed by TV2)
			const assetId = historyItem.id;

			// Try to get episode title from content response
			// Episode title is in player.metainfo[1].text (metainfo[0] is "S1E2" format)
			let episodeTitle = `Episode ${episodeNumber}`; // Fallback
			if (contentResponse?.player?.metainfo?.[1]?.text) {
				episodeTitle = contentResponse.player.metainfo[1].text;
			}

			const values = {
				serviceId: this.id,
				id: assetId,
				title: episodeTitle,
				season: seasonNumber,
				number: episodeNumber,
				show: {
					serviceId: this.id,
					// show.id was removed by TV2, use title as identifier
					id: historyItem.show.title,
					title: historyItem.show.title,
				},
			};
			return new EpisodeItem(values);
		}

		// Otherwise, treat it as a movie (includes sport content)
		return new MovieItem({
			serviceId: this.id,
			id: historyItem.id,
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

		// Use asset_id if available, otherwise fall back to content_id
		const itemId =
			responseJson.player.asset_id ||
			responseJson.player.content_id ||
			responseJson.details.content_id;

		if (responseJson.layout === 'seasonal') {
			// Parse season and episode numbers from the URL
			const episodeMatch = path.match(/\/sesong-(?<season>\d+)\/episode-(?<episode>\d+)/i);
			const seasonNumber = episodeMatch?.groups?.season
				? parseInt(episodeMatch.groups.season, 10)
				: 0;
			const episodeNumber = episodeMatch?.groups?.episode
				? parseInt(episodeMatch.groups.episode, 10)
				: 0;

			// Episode title is in player.metainfo[1].text (metainfo[0] is "S1E2" format)
			let episodeTitle = `Episode ${episodeNumber}`; // Fallback
			if (responseJson.player?.metainfo?.[1]?.text) {
				episodeTitle = responseJson.player.metainfo[1].text;
			}

			const values = {
				serviceId: this.id,
				id: itemId,
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
			id: itemId,
			title: responseJson.details.title,
			year,
		});
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
	} catch (_error) {
		return null;
	}
};

export const Tv2PlayApi = new _Tv2PlayApi();
