import { Item } from '../../models/Item';
import { registerScrobbleParser } from '../common/common';
import { ScrobbleParser } from '../common/ScrobbleController';
import { ScrobblerTemplateApi } from './ScrobblerTemplateApi';

// Define any types you need here.

// This class should parse the item that the user is watching. If the service has an API that provides that information, this class should mostly act as a proxy to the *Api class. If the service does not have an API, this class should retrieve that information directly from the DOM.
class _ScrobblerTemplateParser implements ScrobbleParser {
	// Define any properties you need here.

	// This method should return the item that the user is watching, if the information was successfully retrieved.
	async parseItem(): Promise<Item | undefined> {
		let item: Item | undefined;

		// If the service has an API, this method will most likely look like this.
		item = await ScrobblerTemplateApi.getItem();

		// If the service does not have an API, this method will most likely looks like this.
		const serviceId = 'scrobbler-template';
		const titleElement = document.querySelector('titleSelector');
		const yearElement = document.querySelector('yearSelector');
		const id = 'someUniqueId';
		const type = 'movie';
		const title = titleElement?.textContent ?? '';
		const year = parseInt(yearElement?.textContent ?? '0');
		item = new Item({ serviceId, id, type, title, year });

		return item;
	}

	// Define any methods you need here.
}

export const ScrobblerTemplateParser = new _ScrobblerTemplateParser();

registerScrobbleParser('scrobbler-template', ScrobblerTemplateParser);
