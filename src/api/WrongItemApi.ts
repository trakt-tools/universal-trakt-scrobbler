import { BrowserStorage } from '../common/BrowserStorage';
import { Requests } from '../common/Requests';
import { UrlSuggestion } from '../models/Item';
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
			const response = await Requests.send({
				method: 'GET',
				url: `${this.URL}?serviceId=${encodeURIComponent(serviceId)}&ids=${items
					.map((item) => encodeURIComponent(item.id))
					.join(',')}`,
			});
			const json = JSON.parse(response) as Record<string, UrlSuggestion[] | undefined>;
			items = items.map((item) => ({
				...item,
				urlSuggestions: json[item.id]?.sort((a, b) => {
					if (a.count > b.count) {
						return -1;
					}
					if (b.count > a.count) {
						return 1;
					}
					return 0;
				}),
			}));
		} catch (err) {
			// Do nothing
		}
		items = items.map((item) => ({ ...item, urlSuggestions: item.urlSuggestions ?? null }));
		await getSyncStore(serviceId).update({ items }, true);
	};

	saveSuggestion = async (
		serviceId: StreamingServiceId,
		id: string,
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
		await Requests.send({
			method: 'POST',
			url: this.URL,
			body: { serviceId, id, url },
		});
	};
}

export const WrongItemApi = new _WrongItemApi();
