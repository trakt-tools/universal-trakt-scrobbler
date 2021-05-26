import { Api } from '../common/Api';
import { registerApi } from '../common/common';

// Define any types you need here.

// This class should communicate with the service API, in order to retrieve the necessary information for scrobbling. If the service does not have an API, that information should be retrieved in the *Parser class instead, so that this class only deals with requests, and not direct DOM manipulation. Keep in mind that some services might have hidden APIs that you can use (you can usually find them by watching your network requests when using the service).
class _ScrobblerTemplateApi extends Api {
	// Define any properties you need here.

	constructor() {
		super('scrobbler-template');
	}

	// This method is only required for syncing, but since it is an abstract method, we have to implement at least a basic block for it.
	loadHistory = (itemsToLoad: number, lastSync: number, lastSyncId: string): Promise<void> => {
		return Promise.resolve();
	};

	// Define any methods you need here.
}

export const ScrobblerTemplateApi = new _ScrobblerTemplateApi();

registerApi('scrobbler-template', ScrobblerTemplateApi);
