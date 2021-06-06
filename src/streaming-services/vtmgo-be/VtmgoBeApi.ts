import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _VtmgoBeApi extends Api {
	constructor() {
		super('vtmgo-be');
	}
}

export const VtmgoBeApi = new _VtmgoBeApi();

registerApi('vtmgo-be', VtmgoBeApi);
