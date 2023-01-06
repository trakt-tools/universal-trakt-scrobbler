import { ServiceApi } from '@apis/ServiceApi';
import { Go3Service } from '@/go3/Go3Service';
import { Shared } from '@common/Shared';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';
import { Requests } from '@common/Requests';

export type Go3SingleMetadataItem = Go3MetadataShow | Go3MetadataMovie;

export interface Go3MetadataGeneric {
	id: string;
	title: string;
	year: number;
}

export type Go3MetadataShow = Go3MetadataGeneric & {
	type: 'EPISODE';
	episode: number;
	season: {
		number: number;
		serial: {
			id: string;
			title: string;
		};
	};
};

export type Go3MetadataMovie = Go3MetadataGeneric & {
	type: 'VOD';
};

class _Go3Api extends ServiceApi {
	HOST_URL: string;
	API_URL: string;

	constructor() {
		super(Go3Service.id);

		this.HOST_URL = 'https://go3.lv';
		this.API_URL = `${this.HOST_URL}/api`;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		let item: ScrobbleItem | null = null;
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/products/vods/${id}?platform=BROWSER&lang=EN`,
				method: 'GET',
			});
			item = this.parseMetadata(JSON.parse(responseText) as Go3SingleMetadataItem);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: Go3SingleMetadataItem): ScrobbleItem {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const { id, type, title, year } = metadata;

		if (type === 'EPISODE') {
			const { episode, season } = metadata;
			const { serial } = season;
			const season_number = season['number'];
			const seriesTitle = serial['title'];
			const seriesId = serial['id'];

			item = new EpisodeItem({
				serviceId,
				id,
				title, // Go3 doesn't have episode titles neither in the site nor API, so this matches the series title for now
				year,
				season: season_number,
				number: episode,
				show: {
					serviceId,
					id: seriesId,
					title: seriesTitle,
				},
			});
		} else {
			item = new MovieItem({
				serviceId,
				id,
				title,
				year,
			});
		}

		return item;
	}
}

export const Go3Api = new _Go3Api();
