import { ServiceApi } from '@apis/ServiceApi';
import { Item } from '@models/Item';
import { PlayerPlService } from '@/player-pl/PlayerPlService';

class _PlayerPlApi extends ServiceApi {
	constructor() {
		super(PlayerPlService.id);
	}
}

export const PlayerPlApi = new _PlayerPlApi();
