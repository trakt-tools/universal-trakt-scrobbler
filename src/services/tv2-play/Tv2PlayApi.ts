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

interface TV2PlayContentResponse {
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
		metainfo?: Array<{ text: string; type?: string }>;
	};
	layout: string;
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
		console.log('Token retrieved successfully');

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
			const item = this.parseHistoryItem(historyItem);

			// Fetch progress and year information from content API
			let contentInfo;
			try {
				contentInfo = await this.getProgressForItem(historyItem.asset.path);
			} catch (error) {
				console.error('Failed to get progress for item:', historyItem.asset.path, error);
				// contentInfo will remain undefined, updateItemFromHistory will handle it
			}

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

	async getProgressForItem(
		path: string
	): Promise<{ progress: TV2PlayProgress | null; year: number }> {
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
			};
		} catch (error) {
			console.error('Failed to fetch progress for item:', path, error);
			return { progress: null, year: 0 };
		}
	}

	parseHistoryItem(historyItem: Tv2PlayHistoryItem): ScrobbleItem {
		// Check if it's an episode by looking for season info
		if (historyItem.season && historyItem.season.title) {
			// Parse season number from "Sesong 1" format
			const seasonMatch = historyItem.season.title.match(/\d+/);
			const seasonNumber = seasonMatch ? parseInt(seasonMatch[0], 10) : 0;

			// Parse episode number from path like "/serier/nepobaby-e6rrt3cb/sesong-1/episode-1"
			const episodeMatch = historyItem.asset.path.match(/episode-(?<episode>\d+)/i);
			const episodeNumber = episodeMatch?.groups?.episode
				? parseInt(episodeMatch.groups.episode, 10)
				: 0;

			const values = {
				serviceId: this.id,
				id: historyItem.asset.id,
				title: historyItem.asset.title,
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

		// Check if it's an episode by looking at the URL structure
		const episodeMatch = path.match(/\/sesong-(?<season>\d+)\/episode-(?<episode>\d+)/i);

		if (episodeMatch?.groups) {
			const seasonNumber = parseInt(episodeMatch.groups.season, 10);
			const episodeNumber = parseInt(episodeMatch.groups.episode, 10);

			const values = {
				serviceId: this.id,
				id: responseJson.player.asset_id,
				title: responseJson.details.title,
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

		// Otherwise, treat it as a movie
		const year = this.parseYearFromMetainfo(responseJson.details.metainfo);
		return new MovieItem({
			serviceId: this.id,
			id: responseJson.player.asset_id,
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
	} catch (error) {
		return null;
	}
};

export const Tv2PlayApi = new _Tv2PlayApi();
