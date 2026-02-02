import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Cache } from '@common/Cache';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';
import { SkyshowtimeService } from '@/skyshowtime/SkyshowtimeService';
import { ScriptInjector } from '@common/ScriptInjector';
import { Requests, withHeaders } from '@common/Requests';
import { Shared } from '@common/Shared';

export interface PeacockPublicProfileObj {
	profile: {
		services: {
			[serviceName: string]: PeacockServiceData;
		};
	};
}

export interface SkyshowtimeSession extends ServiceApiSession, PeacockServiceData {}

export interface PeacockServiceData {
	territory: string;
	provider: string;
	proposition: string;
}

export type SkyshowtimeItemMetadata = SkyshowtimeEpisodeMetadata | SkyshowtimeMovieMetadata;

export interface SkyshowtimeItemMetadataResponse {
	attributes: SkyshowtimeItemMetadata;
}

export interface SkyshowtimeEpisodeMetadata {
	episodeNameLong: string;
	episodeNumber: number;
	seasonNumber: number;
	seriesName: string;
}

export interface SkyshowtimeMovieMetadata {
	titleLong: string;
	year: number;
}

class _SkyshowtimeApi extends ServiceApi {
	HOST_URL = 'https://www.skyshowtime.com';
	CONTENT_URL = 'https://atom.skyshowtime.com/adapter-calypso/v3/query/node/content_id';

	CLIENT_VERSION = '4.5.33';

	requests = Requests;
	isActivated = false;
	session?: SkyshowtimeSession | null;

	constructor() {
		super(SkyshowtimeService.id);
	}

	async activate() {
		if (this.session === null) {
			return;
		}

		try {
			const servicesData = await Cache.get('servicesData');
			let cache = servicesData.get(this.id) as PeacockServiceData | undefined;

			if (!cache) {
				const serviceData = await this.getPeacockServiceData();
				if (!serviceData) {
					throw new Error();
				}

				cache = serviceData;

				servicesData.set(this.id, cache);
				await Cache.set({ servicesData });
			}

			this.session = {
				...cache,
				profileName: null,
			};

			this.requests = withHeaders({
				'X-SkyOTT-Provider': this.session.provider,
				'X-SkyOTT-Territory': this.session.territory,
				'X-SkyOTT-Language': 'en-US',
				'X-SkyOTT-Proposition': this.session.proposition,
				'X-SkyOTT-Platform': 'PC',
				'X-SkyOTT-Device': 'COMPUTER',
				'X-SkyOTT-ActiveTerritory': this.session.territory,
				'X-SkyOTT-Client-Version': this.CLIENT_VERSION,
			});

			this.isActivated = true;
		} catch (_err) {
			this.session = null;
		}
	}

	parseItemMetadata(id: string, itemMetadata: SkyshowtimeItemMetadata) {
		let item: ScrobbleItem;

		if ('seriesName' in itemMetadata) {
			item = new EpisodeItem({
				serviceId: this.id,
				id,
				title: itemMetadata.episodeNameLong,
				season: itemMetadata.seasonNumber,
				number: itemMetadata.episodeNumber,
				show: {
					serviceId: this.id,
					title: itemMetadata.seriesName,
				},
			});
		} else {
			item = new MovieItem({
				serviceId: this.id,
				id,
				title: itemMetadata.titleLong,
				year: itemMetadata.year,
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
			const responseText = await this.requests.send({
				url: `${this.CONTENT_URL}/${id}`,
				method: 'GET',
			});

			const response = JSON.parse(responseText) as SkyshowtimeItemMetadataResponse;
			if (response.attributes) {
				item = this.parseItemMetadata(id, response.attributes);
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}

		return item;
	}

	async getPeacockServiceData(): Promise<PeacockServiceData | null> {
		return await ScriptInjector.inject<PeacockServiceData>(
			this.id,
			'serviceData',
			SkyshowtimeService.homePage
		);
	}
}

Shared.functionsToInject[`${SkyshowtimeService.id}-serviceData`] = () => {
	const peacockPublicProfileStr = window.localStorage.getItem('peacock_publicProfile');
	if (peacockPublicProfileStr) {
		const peacockPublicProfileObj = JSON.parse(peacockPublicProfileStr) as PeacockPublicProfileObj;
		return Object.values(peacockPublicProfileObj.profile.services)[0];
	}

	return null;
};

export const SkyshowtimeApi = new _SkyshowtimeApi();
