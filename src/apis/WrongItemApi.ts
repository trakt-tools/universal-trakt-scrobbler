import { BrowserStorage } from '@common/BrowserStorage';
import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Item } from '@models/Item';
import { browser } from 'webextension-polyfill-ts';

export interface Suggestion {
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
	count: number;
}

class _WrongItemApi {
	URL =
		'https://script.google.com/macros/s/AKfycbyRy2Xf9mqeR3mqN77VYxzr8wSyYOxcFBgyMwQQduZo37eW0TDTyPSkwc_52SNMRi4X/exec';

	async loadSuggestions(items: Item[]): Promise<void> {
		const missingItems = items.filter((item) => typeof item.suggestions === 'undefined');
		if (
			missingItems.length === 0 ||
			!BrowserStorage.options.sendReceiveSuggestions ||
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return;
		}
		try {
			const cache = await Messaging.toBackground({
				action: 'get-cache',
				key: 'suggestions',
			});
			const servicesToFetch: Partial<Record<string, Item[]>> = {};
			for (const item of missingItems) {
				let serviceSuggestions = cache[item.serviceId];
				if (!serviceSuggestions) {
					serviceSuggestions = {};
					cache[item.serviceId] = serviceSuggestions;
				}
				const suggestions = serviceSuggestions[item.id];
				if (suggestions) {
					item.suggestions = suggestions;
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
				string,
				Item[]
			][]) {
				if (itemsToFetch.length === 0) {
					continue;
				}
				try {
					const response = await Requests.send({
						method: 'GET',
						url: `${this.URL}?serviceId=${encodeURIComponent(serviceId)}&ids=${itemsToFetch
							.map((item) => encodeURIComponent(item.id))
							.join(',')}`,
					});
					const json = JSON.parse(response) as Record<string, Suggestion[] | undefined>;
					const serviceSuggestions = cache[serviceId];
					if (serviceSuggestions) {
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
						}
					}
				} catch (err) {
					// Do nothing
				}
			}
			for (const item of missingItems) {
				const serviceSuggestions = cache[item.serviceId];
				if (serviceSuggestions && !serviceSuggestions[item.id]) {
					serviceSuggestions[item.id] = [];
				}
				item.suggestions = serviceSuggestions?.[item.id];
			}
			await Messaging.toBackground({
				action: 'set-cache',
				key: 'suggestions',
				value: cache,
			});
		} catch (err) {
			// Do nothing
		}
		for (const item of missingItems) {
			item.suggestions = item.suggestions ?? null;
		}
	}

	async loadItemSuggestions(item: Item): Promise<Item> {
		const itemCopy = new Item(item);
		if (
			typeof itemCopy.suggestions !== 'undefined' ||
			!BrowserStorage.options.sendReceiveSuggestions ||
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
				key: 'suggestions',
			});
			let serviceSuggestions = cache[itemCopy.serviceId];
			if (!serviceSuggestions) {
				serviceSuggestions = {};
				cache[itemCopy.serviceId] = serviceSuggestions;
			}
			suggestions = serviceSuggestions[itemCopy.id];
			if (!suggestions) {
				try {
					const response = await Requests.send({
						method: 'GET',
						url: `${this.URL}?serviceId=${encodeURIComponent(
							itemCopy.serviceId
						)}&ids=${encodeURIComponent(itemCopy.id)}`,
					});
					const json = JSON.parse(response) as Record<string, Suggestion[] | undefined>;
					serviceSuggestions[itemCopy.id] = json[itemCopy.id]?.sort((a, b) => {
						if (a.count > b.count) {
							return -1;
						}
						if (b.count > a.count) {
							return 1;
						}
						return 0;
					});
				} catch (err) {
					// Do nothing
				}
				if (!serviceSuggestions[itemCopy.id]) {
					serviceSuggestions[itemCopy.id] = [];
				}
				suggestions = serviceSuggestions[itemCopy.id];
				await Messaging.toBackground({
					action: 'set-cache',
					key: 'suggestions',
					value: cache,
				});
			}
		} catch (err) {
			// Do nothing
		}
		itemCopy.suggestions = suggestions ?? null;
		return itemCopy;
	}

	async saveSuggestion(item: Item, url: string): Promise<void> {
		if (
			!BrowserStorage.options.sendReceiveSuggestions ||
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
	}
}

export const WrongItemApi = new _WrongItemApi();
