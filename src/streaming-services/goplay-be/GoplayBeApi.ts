import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _GoplayBeApi extends Api {
	constructor() {
		super('goplay-be');
	}

	loadHistory(itemsToLoad: number): Promise<void> {
		return Promise.resolve();
	}
}

export const GoplayBeApi = new _GoplayBeApi();

registerApi('goplay-be', GoplayBeApi);
