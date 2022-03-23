import { PlayerPlService } from '@/player-pl/PlayerPlService';
import { ServiceApi } from '@apis/ServiceApi';

class _PlayerPlApi extends ServiceApi {
	constructor() {
		super(PlayerPlService.id);
	}
}

export const PlayerPlApi = new _PlayerPlApi();
