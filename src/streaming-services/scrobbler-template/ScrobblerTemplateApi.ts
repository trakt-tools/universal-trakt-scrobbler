import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { registerApi } from '../common/common';

// Define any types you need here.

// This class should communicate with the service API, if it has one. Keep in mind that some services might have hidden APIs that you can use (you can usually find them by watching your network requests when using the service).
class _ScrobblerTemplateApi extends Api {
	// Define any properties you need here.

	constructor() {
		// @ts-expect-error
		super('scrobbler-template');
	}

	// This method is only required for syncing, but since it is an abstract method, we have to implement at least a basic block for it.
	loadHistory(itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<void> {
		return Promise.resolve();
	}

	// **This method is optional.** It should only be implemented if the API offers an endpoint for retrieving information about an item using an ID.
	getItem(id: string): Promise<Item | null> {
		return Promise.resolve(null);
	}

	// Define any methods you need here.
}

export const ScrobblerTemplateApi = new _ScrobblerTemplateApi();

// @ts-expect-error
registerApi('scrobbler-template', ScrobblerTemplateApi);
