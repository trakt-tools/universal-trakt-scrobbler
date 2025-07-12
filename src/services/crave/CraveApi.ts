import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import {
	BaseItemValues,
	EpisodeItem,
	MovieItem,
	ScrobbleItem,
	ScrobbleItemValues,
} from '@models/Item';
import { CraveService } from '@/crave/CraveService';
import { Shared } from '@common/Shared';
import { ScriptInjector } from '@common/ScriptInjector';

// URLs
const HOST_URL = CraveService.homePage;
const GRAPHQL_URL = 'https://rte-api.bellmedia.ca/graphql';
const LOGIN_URL = 'https://account.bellmedia.ca/api/login/v2.1?grant_type=refresh_token';
const PROFILES_URL = 'https://account.bellmedia.ca/api/profile/v1.1';

// Models
type GraphQLResponse<T> = { data: T } & { errors: Array<{ message: string }> };

type CraveWatchHistoryPage = {
	watchHistoryItemsPage: {
		cursor: string; // Used for pagination.
		items: Array<CraveHistoryItem>;
	};
};

type CraveHistoryItem = {
	contentId: string;
	mediaName: string;
	displayLabel: string; // This is year of movie, or Season/Episode for TV shows.
	createdDateSecs: number; // Epoch seconds since first watched.
};

type CraveContentItem = {
	id: string;
	title: string;
	contentType: 'EPISODE' | 'FEATURE' | 'PROMO';
	seasonNumber: string;
	episodeNumber: string;
	duration?: {
		progressPercentage: number; // Percentage as an int between 0 and 100.
		remainingTimeInSecs: number;
		lastModifiedTimestamp: number; // Seconds since epoch.
	};
	media: {
		mediaId: string;
		title: string;
		productionYear: string;
		isInWatchList: boolean;
	};
};

type CraveItemByPath = {
	id: string;
	type: 'ContentMetadata' | 'MediaMetadata';
};

type CraveProfile = {
	id: string;
	nickname: string;
};

type CraveSessionNoAuth = ServiceApiSession & {
	isAuthenticated: false;
	profileName: null;
};

type CraveSession = ServiceApiSession & {
	isAuthenticated: true;
	accessToken: string;
	refreshToken: string;
	expirationDate: number; // Expiration time as milliseconds since epoch.
};

type CraveServiceApiSession = CraveSession | CraveSessionNoAuth;

type CraveAuthorizeResponse = {
	access_token: string;
	refresh_token: string;
	scope: string;
	token_type: string;
	expires_in: number;
};

type CraveJwtPayload = {
	context: {
		profile_id: string;
	};
	exp: number; // Expiration time in seconds since epoch.
	iat: number; // Issued at time in seconds since epoch.
	authorities: string[]; // Eg: ["REGULAR_USER"];
	client_id: string; // Eg: "crave-web"
};

type RetryPolicy<T> = {
	numberOfTries: number;
	action: () => Promise<T>;
	onBeforeRetry: () => Promise<void>;
};

// Default values
const DefaultCraveSession: CraveSessionNoAuth = {
	isAuthenticated: false,
	profileName: null,
};

const DefaultGraphQLAccessToken = btoa(JSON.stringify({ platform: 'platform_web' }));

// Helpers
const getGraphQLAccessTokenFromSession = (session: CraveSession): string => {
	// The GraphQL endpoint double-embeds the session access token.
	return btoa(
		JSON.stringify({
			platform: 'platform_web',
			accessToken: session.accessToken,
		})
	);
};

const isAuthenticated = (session: ServiceApiSession | null): session is CraveSession => {
	return (session as CraveSession)?.isAuthenticated;
};

const mapContentToScrobbleItem = (content: CraveContentItem): ScrobbleItem => {
	const baseScrobbleItem: BaseItemValues = {
		serviceId: CraveApi.id,
		id: content.id,
		title: content.title,
		year: parseInt(content.media.productionYear, 10),
		progress: content.duration?.progressPercentage,
		watchedAt: content.duration?.lastModifiedTimestamp ?? 0,
	};
	if (content.contentType === 'EPISODE') {
		return new EpisodeItem({
			...baseScrobbleItem,
			season: parseInt(content.seasonNumber, 10),
			number: parseInt(content.episodeNumber, 10),
			show: {
				serviceId: CraveApi.id,
				id: content.media.mediaId,
				title: content.media.title,
			},
		});
	} else if (content.contentType === 'FEATURE') {
		return new MovieItem(baseScrobbleItem);
	}
	throw new Error(`Unsupported content type: ${content.contentType}`);
};

class _CraveApi extends ServiceApi {
	isActivated = false;
	session: CraveSession | CraveSessionNoAuth = DefaultCraveSession;
	pageSize = 500;
	pageCursor: string | null = null;
	allowedContentTypes = ['episode', 'feature'];

	constructor() {
		super(CraveService.id);
	}

	async activate() {
		try {
			this.session = await this.getInitialSession();
			this.isActivated = true;
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log(`Failed to activate ${this.id} API`, err);
			}
			throw new Error('Failed to activate API');
		}
	}

	async checkLogin(): Promise<boolean> {
		if (!this.isActivated) {
			await this.activate();
		}
		return await super.checkLogin();
	}

	async loadHistoryItems(cancelKey?: string): Promise<CraveHistoryItem[]> {
		const auth = await this.authorize();

		const { watchHistoryItemsPage } = await this.queryWatchHistoryPage(
			auth,
			this.pageSize,
			this.pageCursor
		);
		if (!watchHistoryItemsPage.cursor) {
			this.hasReachedHistoryEnd = true;
		} else {
			this.pageCursor = watchHistoryItemsPage.cursor;
		}

		return watchHistoryItemsPage.items;
	}

	isNewHistoryItem(historyItem: CraveHistoryItem, lastSync: number) {
		return historyItem.createdDateSecs > lastSync;
	}

	getHistoryItemId(historyItem: CraveHistoryItem): string {
		return historyItem.contentId;
	}

	async getItem(path: string): Promise<ScrobbleItem | null> {
		let resolvedPath;
		try {
			resolvedPath = await this.queryItemByPath(path);

			if (!resolvedPath || resolvedPath.type !== 'ContentMetadata') {
				Shared.errors.log('Failed to get item.', new Error(`Item not found for path: ${path}`));
				return null;
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
			return null;
		}

		const contents = await this.queryContents([resolvedPath.id], this.session);
		const contentItem = contents[0];
		if (!contentItem) {
			// Not a trackable content item, so return null.
			Shared.errors.log(
				'Failed to get item.',
				new Error(`Content is not trackable: ${resolvedPath.type}`)
			);
			return null;
		}

		return mapContentToScrobbleItem(contentItem);
	}

	async convertHistoryItems(historyItems: CraveHistoryItem[]): Promise<ScrobbleItem[]> {
		const auth = await this.authorize();

		const scrobbleItems: ScrobbleItem[] = [];

		// The API is limited to 30 IDs per request, so we need to chunk the requests.
		const chunkSize = 30;
		for (let i = 0; i < historyItems.length; i += chunkSize) {
			const chunk = historyItems.slice(i, i + chunkSize).map((item) => item.contentId);
			const contents = await this.queryContents(chunk, auth);
			scrobbleItems.push(...contents.map(mapContentToScrobbleItem));
		}
		return scrobbleItems;
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: CraveHistoryItem): void {
		item.watchedAt = historyItem.createdDateSecs;
	}

	private async authorize(): Promise<CraveSession> {
		if (!this.isActivated) {
			await this.activate();
		}

		if (!this.session.isAuthenticated) {
			throw new Error('User is not authorized.');
		}

		// The token may have expired since the API was activated, so verify
		// that it is still active and refresh if necessary.
		if (!this.verifyAccessToken(this.session)) {
			await this.refresh(this.session);
		}

		return this.session;
	}

	private verifyAccessToken(session: CraveSession): boolean {
		return session.expirationDate > Date.now();
	}

	private async refresh(session: CraveSession): Promise<void> {
		// Get a new access token using the refresh token.
		const responseText = await Requests.send({
			url: LOGIN_URL,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${btoa('crave-web:default')}`,
			},
			body: `grant_type=refresh_token&refresh_token=${session.refreshToken}`,
		});
		const craveAuthorizeResponse = JSON.parse(responseText) as CraveAuthorizeResponse;
		session.accessToken = craveAuthorizeResponse.access_token;
		session.refreshToken = craveAuthorizeResponse.refresh_token;
		const jwtPayload = JSON.parse(atob(session.accessToken.split('.')[1])) as CraveJwtPayload;
		session.expirationDate = jwtPayload.exp * 1000; // Convert seconds to milliseconds.
	}

	private async queryContents(
		ids: string[],
		auth?: CraveServiceApiSession
	): Promise<CraveContentItem[]> {
		// Note that the endpoint is limited to 30 IDs per request.
		if (ids.length > 30) {
			throw new Error('Too many IDs provided. The maximum is 30 per request.');
		}
		let accessToken = DefaultGraphQLAccessToken; // The default token is capable of getting basic info.
		if (auth && isAuthenticated(auth)) {
			// Provide auth if available in order to get personal watch duration.
			accessToken = getGraphQLAccessTokenFromSession(auth);
		}
		const responseText = await Requests.send({
			url: GRAPHQL_URL,
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: {
				query: `
					query GetContents($sessionContext: SessionContext!, $ids: [String!]!) {
						contents(sessionContext: $sessionContext, ids: $ids) {
							id
							title
							seasonNumber
							episodeNumber
							contentType
							duration {
								progressPercentage
								remainingTimeInSecs
								lastModifiedTimestamp
							}
							media {
								title
								productionYear
								isInWatchList
							}
						}
					}
				`,
				variables: {
					sessionContext: {
						userMaturity: 'ADULT',
						userLanguage: 'EN',
					},
					ids,
				},
			},
		});

		const graphResponse = JSON.parse(responseText) as GraphQLResponse<{
			contents: CraveContentItem[];
		}>;
		return graphResponse.data.contents.filter((p) =>
			this.allowedContentTypes.includes(p.contentType.toLowerCase())
		);
	}

	private async queryItemByPath(path: string): Promise<CraveItemByPath | null> {
		const accessToken = DefaultGraphQLAccessToken;
		const responseText = await Requests.send({
			url: GRAPHQL_URL,
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: {
				query: `
					query GetItemByPath($path: String!) {
						itemByPath(path: $path) {
							id
							type
						}
					}
				`,
				variables: {
					path,
					enabled: true,
				},
			},
		});

		const graphResponse = JSON.parse(responseText) as GraphQLResponse<{
			itemByPath: CraveItemByPath;
		}>;
		// Result is null if the item was not found.
		return graphResponse.data.itemByPath ?? null;
	}

	private async queryWatchHistoryPage(
		auth: CraveSession,
		limit: number,
		cursor: string | null
	): Promise<CraveWatchHistoryPage> {
		const responseText = await Requests.send({
			url: GRAPHQL_URL,
			method: 'POST',
			headers: {
				Authorization: `Bearer ${getGraphQLAccessTokenFromSession(auth)}`,
			},
			body: {
				query: `
					query GetWatchHistory(
						$sessionContext: SessionContext!
						$limit: Int
						$cursor: String
					) {
						watchHistoryItemsPage(
							sessionContext: $sessionContext
							limit: $limit
							cursor: $cursor
						) {
							cursor
							items {
								contentId
								mediaName
								displayLabel
								createdDateSecs
							}
						}
					}
				`,
				variables: {
					sessionContext: { userMaturity: 'ADULT', userLanguage: 'EN' },
					limit,
					cursor,
				},
			},
		});
		const graphResponse = JSON.parse(responseText) as GraphQLResponse<CraveWatchHistoryPage>;
		return graphResponse.data;
	}

	private async queryProfiles(auth: CraveSession) {
		const responseText = await Requests.send({
			url: PROFILES_URL,
			method: 'GET',
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
			},
		});
		return JSON.parse(responseText) as Array<CraveProfile>;
	}

	private async getInitialSession(): Promise<CraveSession | CraveSessionNoAuth> {
		const auth = await ScriptInjector.inject<CraveSession>(this.id, 'session', HOST_URL);
		if (auth) {
			// The initial access token might have expired, so refresh and retry if this first query fails.
			const profiles = await this.retry({
				action: () => this.queryProfiles(auth),
				onBeforeRetry: () => this.refresh(auth),
				numberOfTries: 2,
			});
			const profileInfo = profiles.find((p) => p.id === auth.profileName);
			if (profileInfo) {
				auth.profileName = profileInfo.nickname;
			}
			return auth;
		}
		return DefaultCraveSession;
	}

	private async retry<T>({ numberOfTries, action, onBeforeRetry }: RetryPolicy<T>) {
		let i = 0;
		let lastError: Error | null = null;
		do {
			try {
				return await action();
			} catch (err) {
				if (Shared.errors.validate(err)) {
					Shared.errors.log(`An error occurred on attempt #${i + 1}/${numberOfTries}`, err);
					lastError = err;
				}
			}
		} while (++i < numberOfTries && (await onBeforeRetry(), true));

		const error = new Error('Exceeded number of retries');
		if (Shared.errors.validate(lastError)) {
			Shared.errors.log(error.message, lastError);
		}
		throw error;
	}
}

Shared.functionsToInject[`${CraveService.id}-session`] = (): CraveSession | null => {
	const cookies = document.cookie.split(';').reduce((cookiesMap, cookiePair) => {
		const keyValuePair = cookiePair.split('=') as [string, string];
		cookiesMap.set(keyValuePair[0].trimStart(), keyValuePair[1]);
		return cookiesMap;
	}, new Map<string, string>());

	const accessToken = cookies.get('ce_access') ?? '';
	if (!accessToken) {
		return null;
	}

	const jwtPayload = JSON.parse(atob(accessToken.split('.')[1])) as CraveJwtPayload;
	return {
		profileName: jwtPayload.context.profile_id,
		isAuthenticated: true,
		accessToken: accessToken,
		refreshToken: cookies.get('ce_refresh') ?? '',
		expirationDate: jwtPayload.exp * 1000,
	};
};

export const CraveApi = new _CraveApi();
