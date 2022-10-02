import { AmcPlusService } from '@/amc-plus/AmcPlusService';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { ScriptInjector } from '@common/ScriptInjector';
import { Shared } from '@common/Shared';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';

export interface AmcPlusSession extends ServiceApiSession {
	auth: {
		accessToken: string;
	};
}

export interface AmcPlusItemResponse {
	data: {
		properties: AmcPlusEpisodeResponse | AmcPlusMovieResponse;
	};
}

export interface AmcPlusEpisodeResponse {
	pageType: 'episode';
	pageTitle: string;
	id: string;

	// In slug-ish format (e.g. "the-walking-dead")
	showName: string;

	seasonNumber: number;
	episodeNumber: number;
}

export interface AmcPlusMovieResponse {
	pageType: 'movie';
	pageTitle: string;
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
			if (!partialSession || !partialSession.auth || !partialSession.auth.accessToken) {
				throw new Error();
			}

			this.authRequests = withHeaders({
				Authorization: `Bearer ${partialSession.auth.accessToken}`,
			});

			this.session = {
				auth: {
					accessToken: partialSession.auth.accessToken,
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

	parseMetadata(metadata: AmcPlusEpisodeResponse | AmcPlusMovieResponse): ScrobbleItem {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const { pageType: type, pageTitle: title, id } = metadata;
		if (type === 'episode') {
			const { showName: showSlug, seasonNumber: season, episodeNumber: number } = metadata;
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
			this.HOST_URL,
			() => {
				const session: Partial<AmcPlusSession> = {};

				const accessToken = window.localStorage.getItem('access_token');
				if (accessToken) {
					session.auth = {
						accessToken,
					};
				}

				return session;
			}
		);
		return result;
	}
}

export const AmcPlusApi = new _AmcPlusApi();
