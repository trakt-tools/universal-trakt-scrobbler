import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _DisneyplusApi extends Api {
	constructor() {
		super('disneyplus');
	}

	loadHistory(itemsToLoad: number): Promise<void> {
		return Promise.resolve();
	}
}

export const DisneyplusApi = new _DisneyplusApi();

registerApi('disneyplus', DisneyplusApi);
