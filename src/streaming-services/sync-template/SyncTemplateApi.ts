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
		itemsToLoad: number,
		lastSync: number,
		lastSyncId: string
	): Promise<void> => {
		// The code could look like this.
		const store = getSyncStore('sync-template');
		let { hasReachedEnd } = store.data;
		let items: Item[] = [];
		let itemsLoaded = 0;
		while (itemsLoaded < itemsToLoad && !hasReachedEnd) {
			const nextItems = await this.loadNextPage();
			items.push(...nextItems);
			itemsLoaded += nextItems.length;
			hasReachedEnd = this.checkLastPage();
		}
		store.setData({ items, hasReachedEnd });
	};

	// Define any methods you need here.
}

export const SyncTemplateApi = new _SyncTemplateApi();

registerApi('sync-template', SyncTemplateApi);
