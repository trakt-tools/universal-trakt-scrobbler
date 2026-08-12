import { AppleTvService } from '@/apple-tv/AppleTvService';
import { ServiceApi } from '@apis/ServiceApi';

class _AppleTvApi extends ServiceApi {
	constructor() {
		super(AppleTvService.id);
	}
}

export const AppleTvApi = new _AppleTvApi();
