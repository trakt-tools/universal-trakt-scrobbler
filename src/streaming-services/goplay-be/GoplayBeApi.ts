import { Api } from '../common/Api';
import * as GoplayBe from './goplay-be.json';

class _GoplayBeApi extends Api {
	constructor() {
		super(GoplayBe.id);
	}
}

export const GoplayBeApi = new _GoplayBeApi();
