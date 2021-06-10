import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import * as ScrobblerTemplate from './scrobbler-template.json';

// Define any types you need here

/**
 * This class should communicate with the service API, if it has one.
 *
 * Keep in mind that some services might have hidden APIs that you can use (you can usually find them by watching your network requests when using the service).
 */
class _ScrobblerTemplateApi extends Api {
	// Define any properties you need here

	constructor() {
		super(ScrobblerTemplate.id);
	}

	// Define any methods you need here

	/**
	 * **This method is optional.**
	 *
	 * It should only be implemented if the API offers an endpoint for retrieving information about an item using an ID.
	 */
	getItem(id: string): Promise<Item | null> {
		return Promise.resolve(null);
	}
}

export const ScrobblerTemplateApi = new _ScrobblerTemplateApi();
