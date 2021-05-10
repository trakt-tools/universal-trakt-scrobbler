import { BrowserStorage } from '../common/BrowserStorage';
import { CacheValues } from '../common/Cache';
import { Messaging } from '../common/Messaging';
import { Requests } from '../common/Requests';
import { CorrectionSuggestion, Item } from '../models/Item';
import { StreamingServiceId } from '../streaming-services/streaming-services';

class _WrongItemApi {
	URL = 'https://script.google.com/macros/s/AKfycbyz0AYx9-R2cKHxyyRNrMYbqUnqvJbiYxSZTFV0/exec';

	loadSuggestions = async (items: Item[]): Promise<void> => {
		const missingItems = items.filter((item) => typeof item.correctionSuggestions === 'undefined');
		if (missingItems.length === 0) {
			return;
		}
		const { options } = await BrowserStorage.get('options');
		if (
			!options?.sendReceiveSuggestions ||
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return;
		}
		try {
			const cache = (await Messaging.toBackground({
				action: 'get-cache',
				key: 'correctionSuggestions',
			})) as CacheValues['correctionSuggestions'];
			const servicesToFetch: Partial<Record<StreamingServiceId, Item[]>> = {};
			for (const item of missingItems) {
				const suggestions = cache[item.serviceId]?.[item.id];
				if (suggestions) {
					item.correctionSuggestions = suggestions;
				} else {
					let serviceToFetch = servicesToFetch[item.serviceId];
					if (!serviceToFetch) {
						serviceToFetch = [];
						servicesToFetch[item.serviceId] = serviceToFetch;
					}
					serviceToFetch.push(item);
				}
			}
			for (const [serviceId, itemsToFetch] of Object.entries(servicesToFetch) as [
				StreamingServiceId,
				Item[]
			][]) {
				if (itemsToFetch.length === 0) {
					continue;
				}
				const response = await Requests.send({
					method: 'GET',
					url: `${this.URL}?serviceId=${encodeURIComponent(
						serviceId
					)}&ids=${itemsToFetch.map((item) => encodeURIComponent(item.id)).join(',')}`,
				});
				const json = JSON.parse(response) as Record<string, CorrectionSuggestion[] | undefined>;
				let serviceSuggestions = cache[serviceId];
				if (!serviceSuggestions) {
					serviceSuggestions = {};
					cache[serviceId] = serviceSuggestions;
				}
				for (const item of itemsToFetch) {
					serviceSuggestions[item.id] = json[item.id]?.sort((a, b) => {
						if (a.count > b.count) {
							return -1;
						}
						if (b.count > a.count) {
							return 1;
						}
						return 0;
					});
					item.correctionSuggestions = serviceSuggestions[item.id];
				}
			}
			await Messaging.toBackground({
				action: 'set-cache',
				key: 'correctionSuggestions',
				value: cache,
			});
		} catch (err) {
			// Do nothing
		}
		for (const item of missingItems) {
			item.correctionSuggestions = item.correctionSuggestions ?? null;
		}
	};

	loadItemSuggestions = async (item: Item): Promise<Item> => {
		const itemCopy = new Item(item);
		const { options } = await BrowserStorage.get('options');
		if (
			!options?.sendReceiveSuggestions ||
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return itemCopy;
		}
		let suggestions;
		try {
			const cache = (await Messaging.toBackground({
				action: 'get-cache',
				key: 'correctionSuggestions',
			})) as CacheValues['correctionSuggestions'];
			let serviceSuggestions = cache[itemCopy.serviceId];
			suggestions = serviceSuggestions?.[itemCopy.id];
			if (!suggestions) {
				const response = await Requests.send({
					method: 'GET',
					url: `${this.URL}?serviceId=${encodeURIComponent(
						itemCopy.serviceId
					)}&ids=${encodeURIComponent(itemCopy.id)}`,
				});
				const json = JSON.parse(response) as Record<string, CorrectionSuggestion[] | undefined>;
				if (!serviceSuggestions) {
					serviceSuggestions = {};
					cache[itemCopy.serviceId] = serviceSuggestions;
				}
				serviceSuggestions[itemCopy.id] = json[itemCopy.id]?.sort((a, b) => {
					if (a.count > b.count) {
						return -1;
					}
					if (b.count > a.count) {
						return 1;
					}
					return 0;
				});
				await Messaging.toBackground({
					action: 'set-cache',
					key: 'correctionSuggestions',
					value: cache,
				});
				suggestions = serviceSuggestions[itemCopy.id];
			}
		} catch (err) {
			// Do nothing
		}
		itemCopy.correctionSuggestions = suggestions ?? null;
		return itemCopy;
	};

	saveSuggestion = async (item: Item, url: string): Promise<void> => {
		const { options } = await BrowserStorage.get('options');
		if (
			!options?.sendReceiveSuggestions ||
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return;
		}
		const type = item.trakt?.type ?? item.type;
		await Requests.send({
			method: 'POST',
			url: this.URL,
			body: {
				serviceId: item.serviceId,
				id: item.id,
				title: item.getFullTitle(),
				type: type === 'show' ? 'episode' : 'movie',
				traktId: item.trakt?.id,
				url,
			},
		});
	};
}

export const WrongItemApi = new _WrongItemApi();
