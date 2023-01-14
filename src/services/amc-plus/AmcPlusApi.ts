import { AmcPlusService } from '@/amc-plus/AmcPlusService';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';

export interface AmcPlusSession extends ServiceApiSession {
	auth: {
		accessToken: string;
		cacheHash: string;
		userCacheHash: string;
	};
}

export interface AmcPlusItemResponse {
	data: {
		properties: AmcPlusEpisodeResponse | AmcPlusMovieResponse;
	};
}

export interface AmcPlusEpisodeResponse {
	pageType: 'episode';
	pageTitle?: string;
	id: string;

	// In slug-ish format (e.g. "the-walking-dead")
	showName?: string;

	seasonNumber?: number;
	episodeNumber?: number;
}

export interface AmcPlusMovieResponse {
	pageType: 'movie';
	pageTitle?: string;
	id: string;
}

class _AmcPlusApi extends ServiceApi {
	HOST_URL = 'https://www.amcplus.com/foryou';
	API_URL = 'https://gw.cds.amcn.com/content-compiler-cr/api/v1';

	authRequests = Requests;

	isActivated = false;
	session?: AmcPlusSession | null;

	constructor() {
		super(AmcPlusService.id);
	}

	async activate() {
		if (this.session === null) {
			return;
		}

		try {
			const partialSession = await this.getSession();
			if (
				!partialSession ||
				!partialSession.auth ||
				!partialSession.auth.accessToken ||
				!partialSession.auth.cacheHash ||
				!partialSession.auth.userCacheHash
			) {
				throw new Error();
			}

			this.authRequests = withHeaders({
				Authorization: `Bearer ${partialSession.auth.accessToken}`,
				'x-amcn-cache-hash': partialSession.auth.cacheHash,
				'x-amcn-user-cache-hash': partialSession.auth.userCacheHash,
				'x-amcn-language': 'en',
			});

			this.session = {
				auth: {
					accessToken: partialSession.auth.accessToken,
					cacheHash: partialSession.auth.cacheHash,
					userCacheHash: partialSession.auth.userCacheHash,
				},
				profileName: null,
			};

			this.isActivated = true;
		} catch (err) {
			this.session = null;
		}
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
			const responseText = await this.authRequests.send({
				url: `${this.API_URL}/content/amcn/amcplus/path/${id}?`,
				method: 'GET',
			});
			const response = JSON.parse(responseText) as AmcPlusItemResponse;

			item = this.parseMetadata(response.data.properties);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: AmcPlusEpisodeResponse | AmcPlusMovieResponse): ScrobbleItem | null {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const { pageType: type, pageTitle: title, id } = metadata;

		if (!title) {
			return null;
		}

		if (type === 'episode') {
			const { showName: showSlug, seasonNumber: season, episodeNumber: number } = metadata;

			if (!showSlug || typeof season === 'undefined' || typeof number === 'undefined') {
				return null;
			}

			const showTitle = this.formatSlug(showSlug);

			item = new EpisodeItem({
				serviceId,
				id,
				title,
				season,
				number,
				show: {
					serviceId,
					title: showTitle,
				},
			});
		} else {
			item = new MovieItem({
				serviceId,
				id,
				title,
			});
		}
		return item;
	}

	formatSlug(slug: string): string {
		return slug
			.split('-')
			.map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
			.join(' ');
	}

	async getSession(): Promise<Partial<AmcPlusSession> | null> {
		const result = await ScriptInjector.inject<Partial<AmcPlusSession>>(
			this.id,
			'session',
			this.HOST_URL
		);
		return result;
	}
}

Shared.functionsToInject[`${AmcPlusService.id}-session`] = () => {
	const session: Partial<AmcPlusSession> = {};

	const accessToken = window.localStorage.getItem('access_token') ?? '';
	const cacheHash = window.localStorage.getItem('cache_hash') ?? '';
	const userCacheHash = window.localStorage.getItem('user_cache_hash') ?? '';
	session.auth = {
		accessToken,
		cacheHash,
		userCacheHash,
	};

	return session;
};

export const AmcPlusApi = new _AmcPlusApi();
