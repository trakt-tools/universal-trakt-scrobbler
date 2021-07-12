import { GoplayBeService } from '@/goplay-be/GoplayBeService';
import { ServiceApi } from '@api/ServiceApi';

class _GoplayBeApi extends ServiceApi {
	constructor() {
		super(GoplayBeService.id);
	}
}

export const GoplayBeApi = new _GoplayBeApi();
