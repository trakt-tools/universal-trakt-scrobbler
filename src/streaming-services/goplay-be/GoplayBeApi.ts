import { Api } from '../common/Api';
import { GoplayBeService } from './GoplayBeService';

class _GoplayBeApi extends Api {
	constructor() {
		super(GoplayBeService.id);
	}
}

export const GoplayBeApi = new _GoplayBeApi();
