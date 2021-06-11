import { Requests } from '../../common/Requests';
import { Item } from '../../models/Item';
import { Api } from '../common/Api';
import * as ScrobblerSyncTemplate from './scrobbler-sync-template.json';

interface TemplateHistoryItem {}

// Define any types you need here

/**
 * This class should communicate with the service API, in order to retrieve the necessary information for syncing.
 *
 * Keep in mind that some services might have hidden APIs that you can use (you can usually find them by watching your network requests when using the service).
 */
class _ScrobblerSyncTemplateApi extends Api {
	// Define any properties you need here

	constructor() {
		super(ScrobblerSyncTemplate.id);
	}

	/**
	 * This method should load more history items.
	 *
	 * It should also set `hasReachedHistoryEnd` to true when there are no more history items to load.
	 */
	async loadNextHistoryPage(): Promise<TemplateHistoryItem[]> {
		// Example implementation:

		let historyItems: TemplateHistoryItem[] = [];

		// Retrieve the history items
		const responseText = await Requests.send({
			url: '...',
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText);
		historyItems = responseJson?.items ?? [];

		// Check if it has reached the history end
		this.hasReachedHistoryEnd = historyItems.length === 0;

		return historyItems;
	}

	/**
	 * This method should check if a history item is new.
	 */
	isNewHistoryItem(historyItem: TemplateHistoryItem, lastSync: number, lastSyncId: string) {
		// Example implementation:

		return historyItem.date > lastSync;
	}

	/**
	 * This method should transform history items into items.
	 */
	convertHistoryItems(historyItems: TemplateHistoryItem[]) {
		// Example implementation:

		const items = historyItems.map(
			(historyItem) =>
				new Item({
					serviceId: this.id,
					id: historyItem.videoId,
					type: historyItem.type,
					title: historyItem.title,
				})
		);

		return Promise.resolve(items);
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

export const ScrobblerSyncTemplateApi = new _ScrobblerSyncTemplateApi();
