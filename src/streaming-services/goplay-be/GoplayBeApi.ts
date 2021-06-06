import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _GoplayBeApi extends Api {
	constructor() {
		super('goplay-be');
	}
}

export const GoplayBeApi = new _GoplayBeApi();

registerApi('goplay-be', GoplayBeApi);
