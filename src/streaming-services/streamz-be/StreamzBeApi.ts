import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _StreamzBeApi extends Api {
	constructor() {
		super('streamz-be');
	}

	// This method is only required for syncing, but since it is an abstract method, we have to implement at least a basic block for it.
	loadHistory(itemsToLoad: number): Promise<void> {
		return Promise.resolve();
	}
}

export const StreamzBeApi = new _StreamzBeApi();

registerApi('streamz-be', StreamzBeApi);
