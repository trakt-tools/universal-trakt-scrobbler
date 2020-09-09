import { BrowserStorage } from '../common/BrowserStorage';
import { Messaging } from '../common/Messaging';
import { Requests } from '../common/Requests';
import { CorrectionSuggestion, Item } from '../models/Item';
import { getSyncStore } from '../streaming-services/common/common';
import { StreamingServiceId } from '../streaming-services/streaming-services';

class _WrongItemApi {
	URL = 'https://script.google.com/macros/s/AKfycbyz0AYx9-R2cKHxyyRNrMYbqUnqvJbiYxSZTFV0/exec';

	loadSuggestions = async (serviceId: StreamingServiceId): Promise<void> => {
		const { options } = await BrowserStorage.get('options');
		if (
			!options?.sendReceiveSuggestions ||
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return;
		}
		let items = getSyncStore(serviceId).data.items;
		try {
			const cache = await Messaging.toBackground({
				action: 'get-cache',
				key: 'correctionSuggestions',
			});
			let serviceSuggestions = cache[serviceId];
			const missingItems = [];
			for (const item of items) {
				const suggestions = serviceSuggestions?.[item.id];
				if (suggestions) {
					item.correctionSuggestions = suggestions;
				} else {
					missingItems.push(item);
				}
			}
			if (missingItems.length > 0) {
				const response = await Requests.send({
					method: 'GET',
					url: `${this.URL}?serviceId=${encodeURIComponent(
						serviceId
					)}&ids=${missingItems.map((item) => encodeURIComponent(item.id)).join(',')}`,
				});
				const json = JSON.parse(response) as Record<string, CorrectionSuggestion[] | undefined>;
				if (!serviceSuggestions) {
					serviceSuggestions = {};
					cache[serviceId] = serviceSuggestions;
				}
				for (const item of missingItems) {
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
				await Messaging.toBackground({
					action: 'set-cache',
					key: 'correctionSuggestions',
					value: cache,
				});
			}
		} catch (err) {
			// Do nothing
		}
		items = items.map((item) => ({
			...item,
			correctionSuggestions: item.correctionSuggestions ?? null,
		}));
		await getSyncStore(serviceId).update({ items }, true);
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
			const cache = await Messaging.toBackground({
				action: 'get-cache',
				key: 'correctionSuggestions',
			});
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

	saveSuggestion = async (
		serviceId: StreamingServiceId,
		item: Item,
		url: string
	): Promise<void> => {
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
				serviceId,
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
