import { ServiceApi } from '@apis/ServiceApi';
import { WakanimTvService } from '@/wakanim-tv/WakanimTvService';

class _WakanimTvApi extends ServiceApi {
	constructor() {
		super(WakanimTvService.id);
	}
}

export const WakanimTvApi = new _WakanimTvApi();
