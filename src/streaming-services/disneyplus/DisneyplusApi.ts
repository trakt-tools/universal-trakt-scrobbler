import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _DisneyplusApi extends Api {
	constructor() {
		super('disneyplus');
	}
}

export const DisneyplusApi = new _DisneyplusApi();

registerApi('disneyplus', DisneyplusApi);
