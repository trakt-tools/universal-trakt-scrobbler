import { MaxService } from '@/max/MaxService';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Cache } from '@common/Cache';
import { Requests, withHeaders } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';

export interface MaxAuthObj {
	access_token: string;
	refresh_token: string;

	/** In milliseconds */
	expires_on: number;
}

export interface MaxSession extends ServiceApiSession, MaxData {}

export interface MaxData {
	subdomain: string;
	auth: {
		accessToken: string;
		refreshToken: string;

		/** A UNIX timestamp in seconds */
		expiresAt: number;
	};
	deviceSerialNumber: string;
}

export interface MaxProfile {
	profileId: string;
	name: string;
	isMe: boolean;
}

export interface MaxHistoryItem {
	id: string;
	progress: number;
	watchedAt: number;
}

export type MaxItemMetadata = MaxEpisodeMetadata | MaxMovieMetadata;

export interface MaxEpisodeMetadata {
	titles: {
		full: string;
	};
	releaseYear: number;
	seriesTitles: {
		full: string;
	};
	numberInSeason: number;
	seasonNumber: number;
	references: {
		/** Format: urn:hbo:series:XXXXXXXXXXXXXXXXXXXX */
		series: string;
	};
}

export interface MaxMovieMetadata {
	titles: {
		full: string;
	};
	releaseYear: number;
}

export interface MaxAuthResponse {
	access_token: string;
	refresh_token: string;

	/** In seconds */
	expires_in: number;
}

export interface MaxConfigResponse {
	routeKeys: {
		userSubdomain: string;
	};
}

export type MaxProfileResponse = MaxContentResponse<MaxProfileResponseItem>;

export interface MaxProfileResponseItem {
	profiles: MaxProfile[];
}

export type MaxHistoryResponse = MaxHistoryResponseItem[];

export interface MaxHistoryResponseItem {
	/**
	 * Formats:
	 *
	 * - urn:hbo:episode:XXXXXXXXXXXXXXXXXXXX
	 * - urn:hbo:feature:XXXXXXXXXXXXXXXXXXXX
	 */
	id: string;

	position: number;
	runtime: number;

	/** Format: yyyy-MM-ddTHH:mm:ssZ */
	created: string;
}

export type MaxItemMetadataResponse = MaxContentResponse<
	MaxEpisodeMetadata | MaxMovieMetadata
>;

export type MaxContentResponse<T> = (
	| MaxContentSuccessResponse<T>
	| MaxContentErrorResponse
)[];

export interface MaxContentSuccessResponse<T> {
	id: string;
	body: T;
}

export interface MaxContentErrorResponse {
	id: string;
	body: {
		message: string;
	};
}

class _MaxApi extends ServiceApi {
	HOST_URL = 'https://play.max.com';
	API_BASE = 'api.hbo.com';
	GLOBAL_AUTH_URL = `https://oauth.${this.API_BASE}/auth/tokens`;
	LOCAL_AUTH_URL = `https://gateway{subdomain}.${this.API_BASE}/auth/tokens`;
	CONFIG_URL = `https://sessions.${this.API_BASE}/sessions/v1/clientConfig`;
	CONTENT_URL = `https://comet{subdomain}.${this.API_BASE}/content`;
	HISTORY_URL = `https://markers{subdomain}.${this.API_BASE}/markers`;

	/**
	 * These values were retrieved from https://play.max.com/js/app.js:
	 *
	 * - to find `CLIENT_VERSION`, search for `versionString="` to get the first fragment, then search for `displayVersion:"` to get the next fragment, and the last fragment should be the platform (`desktop`)
	 * - to find `CLIENT_ID`, search for `ClientIDs:{` and get the `desktop` property
	 * - to find `CONTRACT`, search for `contract:"`
	 */
	CLIENT_VERSION = 'Hadron/50.41.0.9 desktop';
	CLIENT_ID = '585b02c8-dbe1-432f-b1bb-11cf670fbeb0';
	CONTRACT = 'hadron:1.1.2.0';

	requests = Requests;
	authRequests = Requests;

	isActivated = false;
	session?: MaxSession | null;

	constructor() {
		super(MaxService.id);
	}

	async activate() {
		if (this.session === null) {
			return;
		}

		try {
			const now = Utils.unix();

			const servicesData = await Cache.get('servicesData');
			let cache = servicesData.get(this.id) as MaxData | undefined;

			if (!cache || cache.auth.expiresAt < now) {
				if (!cache) {
					const partialSession = await this.getSession();
					if (!partialSession || !partialSession.auth || !partialSession.deviceSerialNumber) {
						throw new Error();
					}

					cache = {
						subdomain: '',
						auth: partialSession.auth,
						deviceSerialNumber: partialSession.deviceSerialNumber,
					};
				}

				this.requests = withHeaders({
					'x-hbo-client-version': this.CLIENT_VERSION,
				});

				const globalAuthResponseText = await this.requests.send({
					url: this.GLOBAL_AUTH_URL,
					method: 'POST',
					body: {
						client_id: this.CLIENT_ID,
						client_secret: this.CLIENT_ID,
						deviceSerialNumber: cache.deviceSerialNumber,
						grant_type: 'client_credentials',
						scope: 'browse video_playback_free',
					},
				});
				const globalAuthResponse = JSON.parse(globalAuthResponseText) as MaxAuthResponse;

				this.authRequests = withHeaders(
					{
						Authorization: `Bearer ${globalAuthResponse.access_token}`,
					},
					this.requests
				);

				const configResponseText = await this.authRequests.send({
					url: this.CONFIG_URL,
					method: 'POST',
					body: {
						contract: this.CONTRACT,
						preferredLanguages: ['en-us'],
					},
				});
				const configResponse = JSON.parse(configResponseText) as MaxConfigResponse;

				cache.subdomain = configResponse.routeKeys.userSubdomain;

				if (cache.auth.expiresAt < now) {
					const localAuthResponseText = await this.authRequests.send({
						url: Utils.replace(this.LOCAL_AUTH_URL, cache),
						method: 'POST',
						body: {
							refresh_token: cache.auth.refreshToken,
							grant_type: 'refresh_token',
							scope: 'browse video_playback device',
						},
					});
					const localAuthResponse = JSON.parse(localAuthResponseText) as MaxAuthResponse;

					cache.auth.accessToken = localAuthResponse.access_token;
					cache.auth.refreshToken = localAuthResponse.refresh_token;
					cache.auth.expiresAt = now + localAuthResponse.expires_in;
				}

				servicesData.set(this.id, cache);
				await Cache.set({ servicesData });
			}

			this.session = {
				...cache,
				profileName: null,
			};

			this.requests = withHeaders({
				'x-hbo-client-version': this.CLIENT_VERSION,
			});
			this.authRequests = withHeaders(
				{
					Authorization: `Bearer ${this.session.auth.accessToken}`,
				},
				this.requests
			);

			this.isActivated = true;
		} catch (err) {
			this.session = null;
		}

		if (!this.session) {
			return;
		}

		try {
			const profileResponseId = 'urn:hbo:profiles:mine';
			const profileResponseText = await this.authRequests.send({
				url: Utils.replace(this.CONTENT_URL, this.session),
				method: 'POST',
				body: [{ id: profileResponseId }],
			});
			const profileResponse = JSON.parse(profileResponseText) as MaxProfileResponse;
			const profileResponseItem = profileResponse.find(
				(currentItem) => currentItem.id === profileResponseId
			);

			if (profileResponseItem && !('message' in profileResponseItem.body)) {
				const profile = profileResponseItem.body.profiles.find(
					(currentProfile) => currentProfile.isMe
				);
				if (profile) {
					this.session.profileName = profile.name;
				}
			}
		} catch (err) {
			// Do nothing
		}
	}

	async checkLogin() {
		if (!this.isActivated) {
			await this.activate();
		}
		return !!this.session && !!this.session.profileName;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<MaxHistoryItem[]> {
		if (!this.isActivated) {
			await this.activate();
		}
		if (!this.session) {
			throw new Error('Invalid API session');
		}

		const historyItems: MaxHistoryItem[] = [];

		const historyResponseText = await this.authRequests.send({
			url: Utils.replace(this.HISTORY_URL, this.session),
			method: 'GET',
			cancelKey,
		});
		const historyResponse = JSON.parse(historyResponseText) as MaxHistoryResponse;
		const historyResponseItems = historyResponse.filter(
			(item) => item.id.startsWith('urn:hbo:episode') || item.id.startsWith('urn:hbo:feature')
		);

		for (const historyResponseItem of historyResponseItems) {
			historyItems.push({
				id: historyResponseItem.id,
				progress:
					Math.round((historyResponseItem.position / historyResponseItem.runtime) * 10000) / 100,
				watchedAt: Utils.unix(historyResponseItem.created),
			});
		}

		this.hasReachedHistoryEnd = true;

		return historyItems;
	}

	isNewHistoryItem(historyItem: MaxHistoryItem, lastSync: number) {
		return historyItem.watchedAt > lastSync;
	}

	getHistoryItemId(historyItem: MaxHistoryItem) {
		return historyItem.id;
	}

	async convertHistoryItems(historyItems: MaxHistoryItem[]) {
		const items: ScrobbleItem[] = [];

		for (const historyItem of historyItems) {
			const item = await this.getItem(historyItem.id);
			if (item) {
				item.progress = historyItem.progress;
				item.watchedAt = Utils.unix(historyItem.watchedAt);
				items.push(item);
			}
		}

		return items;
	}

	updateItemFromHistory(
		item: ScrobbleItemValues,
		historyItem: MaxHistoryItem
	): Promisable<void> {
		item.watchedAt = Utils.unix(historyItem.watchedAt);
		item.progress = historyItem.progress;
	}

	parseItemMetadata(id: string, itemMetadata: MaxItemMetadata) {
		let item: ScrobbleItem;

		const serviceId = this.id;
		const { releaseYear: year } = itemMetadata;

		if ('seriesTitles' in itemMetadata) {
			const title = itemMetadata.seriesTitles.full.trim();
			const { seasonNumber: season, numberInSeason: number } = itemMetadata;
			const episodeTitle = itemMetadata.titles.full.trim();

			item = new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				year,
				season,
				number,
				show: {
					serviceId,
					title,
					year,
				},
			});
		} else {
			const title = itemMetadata.titles.full.trim();

			item = new MovieItem({
				serviceId,
				id,
				title,
				year,
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
			throw new Error('Invalid API session');
		}

		try {
			const responseText = await this.authRequests.send({
				url: Utils.replace(this.CONTENT_URL, this.session),
				method: 'POST',
				body: [{ id }],
			});
			const response = JSON.parse(responseText) as MaxItemMetadataResponse;

			const responseItem = response.find((currentItem) => currentItem.id === id);
			if (responseItem && !('message' in responseItem.body)) {
				const itemMetadata = responseItem.body;
				item = this.parseItemMetadata(id, itemMetadata);
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}

		return item;
	}

	async getSession(): Promise<Partial<MaxSession> | null> {
		const result = await ScriptInjector.inject<Partial<MaxSession>>(
			this.id,
			'session',
			this.HOST_URL
		);
		if (result?.auth) {
			result.auth.expiresAt = Utils.unix(result.auth.expiresAt);
		}
		return result;
	}
}

Shared.functionsToInject[`${MaxService.id}-session`] = () => {
	const session: Partial<MaxSession> = {};

	const authStr = window.localStorage.getItem('authToken');
	if (authStr) {
		const authObj = JSON.parse(authStr) as MaxAuthObj;
		session.auth = {
			accessToken: authObj.access_token,
			refreshToken: authObj.refresh_token,
			expiresAt: authObj.expires_on,
		};
	}

	const deviceSerialNumber = window.localStorage.getItem('deviceSerialNumber');
	if (deviceSerialNumber) {
		session.deviceSerialNumber = deviceSerialNumber;
	}

	return session;
};

export const MaxApi = new _MaxApi();
