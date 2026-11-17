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

export type Tv2PlayHistoryItemWithContent = Tv2PlayHistoryItem & {
	contentInfo?: Tv2PlayContentInfo;
};

interface Tv2PlayContentInfo {
	progress: TV2PlayProgress | null;
	year: number;
	contentResponse?: TV2PlayContentResponse;
}

// Content API response types
interface TV2PlayProgress {
	position?: number;
	duration: number;
	watched: number;
}

interface TV2PlayImage {
	src: string;
	locs: number;
}

interface TV2PlayContentResponse {
	layout: 'seasonal' | 'movie' | 'plain'; // seasonal=series, movie=film, plain=sport
	player: {
		content_id: string;
		asset_id: string;
		title: string; // Show title, NOT episode title
		progress: TV2PlayProgress;
		image: TV2PlayImage;
		// Episode title is in metainfo[1].text (metainfo[0] is "S1E2" format)
		metainfo?: Array<{ text: string }>;
	};
	details: {
		content_id: string;
		title: string;
		image: TV2PlayImage;
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

	// Unix timestamp in seconds
	expiresAt?: number;
}

class _Tv2PlayApi extends ServiceApi {
	API_URL: string;
	PROFILE_URL: string;
	token: string;
	isActivated: boolean;
	pageSize = 10;
	private tokenExpiresAt = 0;

	authRequests = Requests;

	constructor() {
		super(Tv2PlayService.id);
		this.API_URL = 'https://ai.play.tv2.no/v4';
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
		if (sessionData.expiresAt && Utils.unix() >= sessionData.expiresAt) {
			// The page also only holds an expired token, so there is nothing fresher to pick up
			throw new Error('The TV2 Play access token has expired');
		}

		this.token = sessionData.accessToken;
		this.tokenExpiresAt = sessionData.expiresAt ?? 0;

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
	/**
	 * Re-activates when the access token has expired - the TV 2 Play page keeps a fresh
	 * token in localStorage, so a new session injection picks it up.
	 */
	private async ensureActivated(): Promise<void> {
		// Re-activate a little before the token expires, so that requests don't fail mid-sync
		if (
			!this.isActivated ||
			(this.tokenExpiresAt > 0 && Utils.unix() >= this.tokenExpiresAt - 60)
		) {
			await this.activate();
		}
	}

	async checkLogin() {
		await this.ensureActivated();
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<Tv2PlayHistoryItem[]> {
		await this.ensureActivated();

		// Retrieve the history items
		const responseText = await this.authRequests.send({
			url: `${this.API_URL}/viewinghistory/?start=${
				this.nextHistoryPage * this.pageSize
			}&size=${this.pageSize}`,
			method: 'GET',
			cancelKey,
		});
		const historyItems = JSON.parse(responseText) as Tv2PlayHistoryItem[];

		this.nextHistoryPage += 1;
		// Check if it has reached the history end
		this.hasReachedHistoryEnd = historyItems.length === 0;

		return historyItems;
	}

	isNewHistoryItem(historyItem: Tv2PlayHistoryItem, lastSync: number, _lastSyncId: string) {
		// `lastSync` is a unix timestamp in seconds, so the item date must be converted to
		// seconds as well - comparing milliseconds to seconds would treat every item as new.
		return Utils.unix(historyItem.date) > lastSync;
	}

	getHistoryItemId(historyItem: Tv2PlayHistoryItem) {
		return historyItem.id.toString();
	}

	/**
	 * Enriches history items with content info (progress, year, and episode title for episodes)
	 * before cached items and new items take separate paths, so that
	 * `updateItemFromHistory()` can keep the progress of cached items up-to-date.
	 */
	prepareHistoryItems(
		historyItems: Tv2PlayHistoryItem[]
	): Promise<Tv2PlayHistoryItemWithContent[]> {
		return Promise.all(
			historyItems.map(async (historyItem) => ({
				...historyItem,
				contentInfo: await this.getProgressForItem(historyItem.asset.path),
			}))
		);
	}

	async convertHistoryItems(historyItems: Tv2PlayHistoryItemWithContent[]) {
		const promises = historyItems.map(async (historyItem) => {
			const item = await this.parseHistoryItemWithTitle(
				historyItem,
				historyItem.contentInfo?.contentResponse
			);

			await this.updateItemFromHistory(item, historyItem);
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
		await this.ensureActivated();

		try {
			const responseText = await this.authRequests.send({
				url: `${this.API_URL}/content/path${path}`,
				method: 'GET',
			});
			const responseJson = JSON.parse(responseText) as TV2PlayContentResponse;

			return {
				progress: responseJson.player.progress,
				year: this.parseYearFromMetainfo(responseJson.details.metainfo),
				contentResponse: responseJson,
			};
		} catch (error) {
			console.debug('[UTS] Failed to fetch progress for TV 2 Play item', path, error);
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

			// Use historyItem.id as the identifier (asset.id was removed by TV2). It holds the
			// same value as the content response's player.asset_id, which getItem() uses for
			// scrobbled items, so corrections are shared between scrobbling and history sync.
			const assetId = historyItem.id;

			// The asset title in the history response is the episode title, so the content
			// response (player.metainfo[1].text) is only needed as a fallback
			const episodeTitle =
				historyItem.asset.title ||
				contentResponse?.player?.metainfo?.[1]?.text ||
				`Episode ${episodeNumber}`;

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
		historyItem: Tv2PlayHistoryItemWithContent
	): Promisable<void> {
		const { contentInfo } = historyItem;
		item.watchedAt = historyItem.date ? Utils.unix(historyItem.date) : undefined;

		// Use the watched percentage directly from the API
		if (contentInfo?.progress && typeof contentInfo.progress.watched === 'number') {
			item.progress = contentInfo.progress.watched;
		} else if (!item.progress) {
			// The progress lookup failed - keep any previously known progress instead of
			// overwriting it, and only assume fully watched when nothing is known
			item.progress = 100;
		}

		// Set year for movies
		if (item.type === 'movie' && contentInfo?.year && contentInfo.year > 0) {
			item.year = contentInfo.year;
		}

		const imageUrl = contentInfo?.contentResponse?.player.image?.src;
		if (imageUrl) {
			item.imageUrl = imageUrl;
		}
	}

	async getItem(path: string): Promise<ScrobbleItem> {
		await this.ensureActivated();

		const responseText = await this.authRequests.send({
			url: `${this.API_URL}/content/path${path}`,
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
				imageUrl: responseJson.player.image?.src,
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
			imageUrl: responseJson.player.image?.src,
		});
	}
}

/**
 * Inject this function into the TV2 Play page to retrieve the Auth0 token from localStorage.
 *
 * auth0-spa-js stores several `@@auth0spajs@@` entries (the token entry is keyed by
 * `::<clientId>::<audience>::<scope>`, the user entry by `::<clientId>::@@user@@`), so every
 * entry is checked and the one holding the freshest access token is used.
 *
 * When the page has just been opened, the cached token may have expired, and the page only
 * renews it (with its refresh token) after it has loaded, so the function polls for a while
 * until a fresh token shows up, returning the expired one if none does.
 *
 * It must not use syntax that Babel transpiles with helpers (async/await, for...of, spread).
 */
Shared.functionsToInject[`${Tv2PlayService.id}-session`] = (): Promise<Tv2PlaySession | null> => {
	const AUDIENCE = 'https://id.tv2.no';
	// Same margin auth0-spa-js uses before it considers a cached token expired
	const EXPIRY_MARGIN = 60;
	const POLL_INTERVAL = 500;
	const MAX_WAIT = 20000;

	const findSession = (): Tv2PlaySession | null => {
		let best: Tv2PlaySession | null = null;
		let bestMatchesAudience = false;
		const keys = Object.keys(window.localStorage);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (key.indexOf('@@auth0spajs@@::') !== 0) {
				continue;
			}
			try {
				const auth0DataStr = window.localStorage.getItem(key);
				if (!auth0DataStr) {
					continue;
				}
				const auth0Data = JSON.parse(auth0DataStr) as Auth0TokenData;
				if (!auth0Data.body || !auth0Data.body.access_token) {
					continue;
				}
				const matchesAudience = key.split('::')[2] === AUDIENCE;
				const isBetter =
					!best ||
					(matchesAudience && !bestMatchesAudience) ||
					(matchesAudience === bestMatchesAudience &&
						(auth0Data.expiresAt || 0) > (best.expiresAt || 0));
				if (isBetter) {
					best = {
						accessToken: auth0Data.body.access_token,
						refreshToken: auth0Data.body.refresh_token,
						expiresAt: auth0Data.expiresAt,
					};
					bestMatchesAudience = matchesAudience;
				}
			} catch (_error) {
				// Ignore entries that are not valid JSON
			}
		}
		return best;
	};

	const isFresh = (session: Tv2PlaySession | null) =>
		!!session &&
		(!session.expiresAt || session.expiresAt - EXPIRY_MARGIN > Math.floor(Date.now() / 1e3));

	return new Promise((resolve) => {
		const startedAt = Date.now();
		const check = () => {
			const session = findSession();
			if (isFresh(session) || Date.now() - startedAt >= MAX_WAIT) {
				resolve(session);
				return;
			}
			setTimeout(check, POLL_INTERVAL);
		};
		check();
	});
};

export const Tv2PlayApi = new _Tv2PlayApi();
