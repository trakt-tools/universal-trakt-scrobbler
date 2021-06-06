import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _VrtnuBeApi extends Api {
	constructor() {
		super('vrtnu-be');
	}
}

export const VrtnuBeApi = new _VrtnuBeApi();

registerApi('vrtnu-be', VrtnuBeApi);
