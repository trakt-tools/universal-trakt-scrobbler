import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _StreamzBeApi extends Api {
	constructor() {
		super('streamz-be');
	}
}

export const StreamzBeApi = new _StreamzBeApi();

registerApi('streamz-be', StreamzBeApi);
