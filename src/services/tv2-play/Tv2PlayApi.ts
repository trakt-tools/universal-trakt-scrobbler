import { ServiceApi } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { Tv2PlayService } from '@/services/tv2-play/Tv2PlayService';
import { Utils } from '@common/Utils';
import { Shared } from '@common/Shared';
import { ScriptInjector } from '@common/ScriptInjector';

interface Asset {
	id: number;
	path: string;
	title: string;
}

export interface Tv2PlayHistoryItem {
	id: number;
	date: string;
	asset: Asset;
	season: Asset;
	show: Asset;
}

type TV2PlayMetadataResponse = TV2PlayMetadataResponseEpisode | TV2PlayMetadataResponseMovie;

interface TV2PlayMetadataResponseEpisode {
	id: number;
	title: string;
	asset_type: 'episode';
	episode_number: number;
	episode_title: string;
	season_number: number;
	show: {
		id: number;
		title: string;
	};
}

interface TV2PlayMetadataResponseMovie {
	id: number;
	title: string;
	asset_type: 'movie';
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
			const item = await this.getItem(`${historyItem.id}`);
			await this.updateItemFromHistory(item, historyItem);
			return item;
		});

		return Promise.all(promises);
	}

	updateItemFromHistory(
		item: ScrobbleItemValues,
		historyItem: Tv2PlayHistoryItem
	): Promisable<void> {
		item.watchedAt = historyItem.date ? Utils.unix(historyItem.date) : undefined;
		item.progress = 100; //TODO not present in API. There might be a separate progress API.
	}

	async getItem(id: string): Promise<ScrobbleItem> {
		const responseText = await Requests.send({
			url: `https://play.tv2.no/rest/assets/${id}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as TV2PlayMetadataResponse;

		if (responseJson.asset_type === 'episode') {
			const values = {
				serviceId: this.id,
				id,
				title: responseJson.episode_title,
				season: responseJson.season_number,
				number: responseJson.episode_number,
				show: {
					serviceId: this.id,
					id: responseJson.show.id.toString(),
					title: responseJson.show.title,
				},
			};
			return new EpisodeItem(values);
		}
		return new MovieItem({
			serviceId: this.id,
			id,
			title: responseJson.title,
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
