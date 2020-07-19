import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import { getSyncStore, registerApi } from '../common/common';

// Define any types you need here.

// This class should communicate with the service API, in order to retrieve the necessary information for syncing. Keep in mind that some services might have hidden APIs that you can use (you can usually find them by watching your network requests when using the service).
class _SyncTemplateApi extends Api {
	// Define any properties you need here.

	constructor() {
		super('sync-template');
	}

	// This method should load the next page of history items and update the sync store for the service.
	loadHistory = async (
		nextPage: number,
		nextVisualPage: number,
		itemsToLoad: number
	): Promise<void> => {
		// The code could look like this.
		let items: Item[] = [];
		let itemsLoaded = 0;
		let isLastPage = false;
		while (itemsLoaded < itemsToLoad && !isLastPage) {
			const nextItems = await this.loadPage(nextPage);
			items.push(...nextItems);
			itemsLoaded += nextItems.length;
			nextPage += 1;
			isLastPage = this.checkLastPage();
		}
		nextVisualPage += 1;
		await getSyncStore('sync-template').update({ isLastPage, nextPage, nextVisualPage, items });
	};

	// Define any methods you need here.
}

export const SyncTemplateApi = new _SyncTemplateApi();

registerApi('sync-template', SyncTemplateApi);
