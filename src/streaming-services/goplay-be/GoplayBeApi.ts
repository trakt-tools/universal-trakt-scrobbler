import { GoplayBeService } from '@/goplay-be/GoplayBeService';
import { Api } from '@common/Api';

class _GoplayBeApi extends Api {
	constructor() {
		super(GoplayBeService.id);
	}
}

export const GoplayBeApi = new _GoplayBeApi();
