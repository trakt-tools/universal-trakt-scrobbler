import { GoplayBeService } from '@/goplay-be/GoplayBeService';
import { ServiceApi } from '@apis/ServiceApi';

class _GoplayBeApi extends ServiceApi {
	constructor() {
		super(GoplayBeService.id);
	}
}

export const GoplayBeApi = new _GoplayBeApi();
