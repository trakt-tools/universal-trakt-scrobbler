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
const WATCH_HISTORY_URL = 'https://recodata.shared-svc.bellmedia.ca/api/bookmark/v2/watchHistory';
const GRAPHQL_URL = 'https://www.crave.ca/space-graphql/apq/graphql';
const LOGIN_URL = 'https://account.bellmedia.ca/api/login/v2.1?grant_type=refresh_token';
const PROFILES_URL = 'https://account.bellmedia.ca/api/profile/v1.1';

// Models
export interface CraveHistoryItem {
	/**
	 * Unique identifier for this episode or feature.
	 */
	contentId: `${number}`;
	/**
	 * Parent identifier common to content that is in a series.
	 */
	mediaId: `${number}`;
	progression: number;
	completed: boolean;
	title: string;
	season: `${number}` | '';
	episode: `${number}` | '';
	contentType: 'episode' | 'feature' | 'promo';
	/**
	 * UTC file time in ms.
	 */
	timestamp: number;
}

type GraphQLResponse<T> = { data: T } & { errors: Array<{ message: string }> };

export interface CraveAxisContent {
	axisId: number;
	title: string;
	seasonNumber: number;
	episodeNumber: number;
	axisMedia: CraveAxisMedia;
	contentType: 'EPISODE' | 'FEATURE' | 'PROMO';
}

export interface CraveAxisMedia {
	axisId: number;
	title: string;
	firstAirYear: number;
}

export interface CraveProfile {
	id: string;
	nickname: string;
}

interface CraveSessionNoAuth extends ServiceApiSession {
	profileName: null;
	isAuthenticated: false;
	expirationDate: null;
}

interface CraveSession extends ServiceApiSession {
	isAuthenticated: true;
	accessToken: string;
	refreshToken: string;
	expirationDate: number;
}

interface CraveWatchHistoryPageResponse {
	content: Array<CraveHistoryItem>;
	last: boolean;
}

interface CraveAxisContentsResponse {
	contentData: {
		items: Array<CraveAxisContent>;
	};
}

interface CraveResolvedPathResponse {
	resolvedPath: {
		lastSegment: {
			content: CraveAxisContent;
		};
	};
}

interface CraveAuthorizeResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	creation_date: number;
}

interface RetryPolicy<T> {
	numberOfTries: number;
	action: () => Promise<T>;
	onBeforeRetry: () => Promise<void>;
}

class _CraveApi extends ServiceApi {
	isActivated = false;
	session?: CraveSession | CraveSessionNoAuth;
	pageNumber = 0;
	pageSize = 500;
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

		const watchHistoryPage = await this.queryWatchHistoryPage(auth, cancelKey);
		if (watchHistoryPage.last) {
			this.hasReachedHistoryEnd = true;
		} else {
			this.pageNumber++;
		}

		// Exclude non-episode or feature items, such as trailers.
		return watchHistoryPage.content.filter((p) => this.allowedContentTypes.includes(p.contentType));
	}

	isNewHistoryItem(historyItem: CraveHistoryItem, lastSync: number) {
		return historyItem.timestamp / 1000 > lastSync;
	}

	getHistoryItemId(historyItem: CraveHistoryItem): string {
		return historyItem.contentId;
	}

	async getItem(path: string): Promise<ScrobbleItem | null> {
		let resolvedPath;
		try {
			resolvedPath = await this.queryResolvedPath(path);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
			return null;
		}

		const baseScrobbleItem: BaseItemValues = {
			serviceId: this.id,
			id: resolvedPath.axisId.toString(),
			title: resolvedPath.title,
			year: resolvedPath.axisMedia.firstAirYear,
		};
		if (resolvedPath.contentType === 'FEATURE') {
			return new MovieItem(baseScrobbleItem);
		} else if (resolvedPath.contentType === 'EPISODE') {
			return new EpisodeItem({
				...baseScrobbleItem,
				season: resolvedPath.seasonNumber,
				number: resolvedPath.episodeNumber,
				show: {
					serviceId: this.id,
					id: resolvedPath.axisMedia.axisId.toString(),
					title: resolvedPath.axisMedia.title,
				},
			});
		}
		// Not a trackable content item, so return null.
		Shared.errors.log(
			'Failed to get item.',
			new Error(`Content is not trackable: ${resolvedPath.contentType}`)
		);
		return null;
	}

	async convertHistoryItems(historyItems: CraveHistoryItem[]): Promise<ScrobbleItem[]> {
		const itemsWithMetadata = await this.loadHistoryItemsMetadata(historyItems);
		const items = itemsWithMetadata.map(({ watchedItem, axisItem }) => {
			const baseScrobbleItem: BaseItemValues = {
				serviceId: this.id,
				id: watchedItem.contentId,
				// Use Crave's completion flag in place of the progress threshold checked by the add-on.
				// This can avoid causing the add-on to sync the same viewing twice.
				progress: watchedItem.completed ? watchedItem.progression : 0,
				title: axisItem?.title ?? watchedItem.title,
				watchedAt: watchedItem.timestamp / 1000,
				year: axisItem?.axisMedia.firstAirYear,
			};
			if (watchedItem.contentType === 'episode') {
				return new EpisodeItem({
					...baseScrobbleItem,
					season: Number(watchedItem.season),
					number: Number(watchedItem.episode),
					show: {
						serviceId: this.id,
						id: watchedItem.mediaId,
						title: axisItem?.axisMedia.title ?? '',
					},
				});
			} else {
				return new MovieItem(baseScrobbleItem);
			}
		});

		return Promise.resolve(items);
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: CraveHistoryItem): void {
		item.progress = historyItem.progression;
		item.watchedAt = historyItem.timestamp / 1000;
	}

	private async loadHistoryItemsMetadata(historyItems: CraveHistoryItem[]) {
		type WatchedItemMetadata = { watchedItem: CraveHistoryItem; axisItem?: CraveAxisContent };

		const axisIds = historyItems.map((p) => Number(p.contentId));
		const axisItems = await this.queryAxisContentsByAxisIds(axisIds);

		return historyItems.reduce<Array<WatchedItemMetadata>>((metadata, watchedItem) => {
			const axisItem = axisItems.find((p) => p.axisId == +watchedItem.contentId);
			metadata.push({ watchedItem, axisItem });

			return metadata;
		}, []);
	}

	private async authorize(): Promise<CraveSession> {
		if (!this.isActivated) {
			await this.activate();
		}

		if (!this.session || !this.session?.isAuthenticated) {
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
			body: `refresh_token=${session.refreshToken}`,
		});
		const craveAuthorizeResponse = JSON.parse(responseText) as CraveAuthorizeResponse;
		session.accessToken = craveAuthorizeResponse.access_token;
		session.refreshToken = craveAuthorizeResponse.refresh_token;
		session.expirationDate =
			craveAuthorizeResponse.creation_date + craveAuthorizeResponse.expires_in;
	}

	private async queryAxisContentsByAxisIds(axisIds: number[]) {
		const requestDetails = {
			url: GRAPHQL_URL,
			method: 'POST',
			body: {
				operationName: 'AxisContents',
				variables: {
					axisIds,
					subscriptions: ['CRAVE', 'STARZ', 'SUPER_ECRAN'],
					maturity: 'ADULT',
					language: 'ENGLISH',
					authenticationState: 'AUTH',
					playbackLanguage: 'ENGLISH',
				},
				query: `query AxisContents($axisIds: [Int], $subscriptions: [Subscription]!, $maturity: Maturity!, $language: Language!, $authenticationState: AuthenticationState!, $playbackLanguage: PlaybackLanguage!) @uaContext(subscriptions: $subscriptions, maturity: $maturity, language: $language, authenticationState: $authenticationState, playbackLanguage: $playbackLanguage) {
					contentData: axisContents(axisIds: $axisIds) {
						items: contents {
							id
							axisId
							title
							__typename
							... on AxisContent {
								seasonNumber
								episodeNumber
								path
								axisMedia {
									id
									axisId
									title
									firstAirYear
									__typename
								}
								contentType
								__typename
							}
						}
						__typename
					}
				}`,
			},
		};
		const responseText = await Requests.send(requestDetails);
		const response = JSON.parse(responseText) as GraphQLResponse<CraveAxisContentsResponse>;
		if (response.errors) {
			Shared.errors.warning(
				'AxisContents GraphQL query responded with errors',
				new Error(response.errors.join('\n'))
			);
			return [];
		}
		return response.data.contentData.items;
	}

	private async queryResolvedPath(path: string) {
		const requestDetails = {
			url: GRAPHQL_URL,
			method: 'POST',
			body: {
				operationName: 'resolvePath',
				variables: {
					path,
					subscriptions: ['CRAVE', 'STARZ', 'SUPER_ECRAN'],
					maturity: 'ADULT',
					language: 'ENGLISH',
					authenticationState: 'AUTH',
					playbackLanguage: 'ENGLISH',
				},
				query: `query resolvePath($path: String!, $subscriptions: [Subscription]!, $maturity: Maturity!, $language: Language!, $authenticationState: AuthenticationState!, $playbackLanguage: PlaybackLanguage!) @uaContext(subscriptions: $subscriptions, maturity: $maturity, language: $language, authenticationState: $authenticationState, playbackLanguage: $playbackLanguage) {
					resolvedPath(path: $path) {
						redirected
						path
						lastSegment {
							position
							content {
								id
								title
								path
								__typename
								... on AxisContent {
									axisId
									__typename
									seasonNumber
									episodeNumber
									path
									axisMedia {
										id
										axisId
										title
										firstAirYear
										__typename
									}
									contentType
									__typename
								}
								__typename
							}
							__typename
						}
					}
				}`,
			},
		};
		const responseText = await Requests.send(requestDetails);
		const response = JSON.parse(responseText) as GraphQLResponse<CraveResolvedPathResponse>;
		if (response.errors) {
			throw new Error(`resolvePath GraphQL query responded with errors.
				${response.errors.join('\n')}`);
		}
		return response.data.resolvedPath.lastSegment.content;
	}

	private async queryWatchHistoryPage(auth: CraveSession, cancelKey: string | undefined) {
		const params = `?pageNumber=${this.pageNumber}&pageSize=${this.pageSize}`;
		const responseText = await Requests.send({
			url: `${WATCH_HISTORY_URL}${params}`,
			method: 'GET',
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
			},
			cancelKey,
		});
		const response = JSON.parse(responseText) as CraveWatchHistoryPageResponse;
		return response;
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
		return { isAuthenticated: false, profileName: null, expirationDate: null };
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

	const accessToken = cookies.get('access') ?? '';
	if (!accessToken) {
		return null;
	}

	const jwtPayload = JSON.parse(atob(accessToken.split('.')[1])) as {
		exp: number;
		profile_id: string;
	};
	return {
		profileName: jwtPayload.profile_id,
		isAuthenticated: true,
		accessToken: accessToken,
		refreshToken: cookies.get('refresh') ?? '',
		expirationDate: jwtPayload.exp * 1000,
	};
};

export const CraveApi = new _CraveApi();
