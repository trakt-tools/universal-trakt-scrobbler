import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _VtmgoBeApi extends Api {
	constructor() {
		super('vtmgo-be');
	}

	loadHistory(itemsToLoad: number): Promise<void> {
		return Promise.resolve();
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();

registerApi('vtmgo-be', VtmgoBeApi);
