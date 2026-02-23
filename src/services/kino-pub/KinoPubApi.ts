import { ServiceApi } from '@apis/ServiceApi';
import { KinoPubService } from '@/kino-pub/KinoPubService';

class _KinoPubApi extends ServiceApi {
	constructor() {
		super(KinoPubService.id);
	}
}

export const KinoPubApi = new _KinoPubApi();
