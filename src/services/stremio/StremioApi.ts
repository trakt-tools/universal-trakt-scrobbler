import { StremioService } from '@/stremio/StremioService';
import { ServiceApi } from '@apis/ServiceApi';
import { EpisodeItem, MovieItem } from '@models/Item';

class _StremioApi extends ServiceApi {
	constructor() {
		super(StremioService.id);
	}

	getItem(_id: string): Promise<MovieItem | EpisodeItem | null> {
		return Promise.resolve(null);
	}
}

export const StremioApi = new _StremioApi();
