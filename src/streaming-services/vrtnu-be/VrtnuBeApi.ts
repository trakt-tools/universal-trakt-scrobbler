import { Api } from '../common/Api';
import { registerApi } from '../common/common';

class _VrtnuBeApi extends Api {
	constructor() {
		super('vrtnu-be');
	}

	// This method is only required for syncing, but since it is an abstract method, we have to implement at least a basic block for it.
	loadHistory(itemsToLoad: number): Promise<void> {
		return Promise.resolve();
	}
}

export const VrtnuBeApi = new _VrtnuBeApi();

registerApi('vrtnu-be', VrtnuBeApi);
