import { ServiceApi } from '@apis/ServiceApi';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';
import { Tv2PlayService } from '@/tv2-play/Tv2PlayService';
import { Requests } from '@common/Requests';

type TV2SumoMetadataResponse = TV2SumoMetadataResponseEpisode | TV2SumoMetadataResponseMovie;

interface TV2SumoMetadataResponseEpisode {
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

interface TV2SumoMetadataResponseMovie {
	id: number;
	title: string;
	asset_type: 'movie';
}

class _Tv2PlayApi extends ServiceApi {
	constructor() {
		super(Tv2PlayService.id);
	}

	async getItem(id: string): Promise<ScrobbleItem> {
		const responseText = await Requests.send({
			url: `https://sumo.tv2.no/rest/assets/${id}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as TV2SumoMetadataResponse;

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

export const Tv2PlayApi = new _Tv2PlayApi();
