import { ServiceApi } from '@apis/ServiceApi';
import { TetPlusService } from '@/tet-plus/TetPlusService';
import { Shared } from '@common/Shared';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { Requests } from '@common/Requests';

export interface TetPlusSingleMetadataItem {
	data: {
		0: TetPlusMetadataShow | TetPlusMetadataMovie;
	};
}

export interface TetPlusMetadataGeneric {
	id: string;
	attributes: {
		title: string;
		year: number;
	};
}

export type TetPlusMetadataShow = TetPlusMetadataGeneric & {
	type: 'series';
	attributes: {
		'season-nr': number;
		'episode-nr': number;
		'series-id': string;
		'series-name': string;
		'episode-name': string;
	};
};

export type TetPlusMetadataMovie = TetPlusMetadataGeneric & {
	type: 'movie';
};

class _TetPlusApi extends ServiceApi {
	HOST_URL: string;
	API_URL: string;

	constructor() {
		super(TetPlusService.id);

		this.HOST_URL = 'https://manstv.lattelecom.tv';
		this.API_URL = `${this.HOST_URL}/api/v1.11`;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		let item: ScrobbleItem | null = null;
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/get/content/vods/${id}?filter[lang]=en`,
				method: 'GET',
			});
			item = this.parseMetadata(JSON.parse(responseText) as TetPlusSingleMetadataItem);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to get item.', err);
			}
		}
		return item;
	}

	parseMetadata(metadata: TetPlusSingleMetadataItem): ScrobbleItem {
		let item: ScrobbleItem;
		const serviceId = this.id;
		const { data } = metadata;
		const { id, type, attributes } = data[0];
		const { title, year } = attributes;

		if (type === 'series') {
			const season = attributes['season-nr'];
			const number = attributes['episode-nr'];
			const episodeTitle = attributes['episode-name'];
			const seriesTitle = attributes['series-name'];
			const seriesId = attributes['series-id'];

			item = new EpisodeItem({
				serviceId,
				id,
				title: episodeTitle,
				year,
				season,
				number,
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

export const TetPlusApi = new _TetPlusApi();
