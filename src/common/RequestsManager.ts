import { RequestsCancelData, StorageOptionsChangeData } from '@common/Events';
import { Shared } from '@common/Shared';
import { getServices } from '@models/Service';
import { AxiosInstance } from 'axios';
import browser, { WebRequest as WebExtWebRequest } from 'webextension-polyfill';

class _RequestsManager {
	abortControllers = new Map<string, AbortController>();
	instances = new Map<string, AxiosInstance>();

	init() {
		if (Shared.pageType === 'background') {
			this.checkWebRequestListener();
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
		}
		Shared.events.subscribe('REQUESTS_CANCEL', null, this.onRequestsCancel);
	}

	onStorageOptionsChange = (data: StorageOptionsChangeData) => {
		if (data.options && 'grantCookies' in data.options) {
			this.checkWebRequestListener();
		}
	};

	checkWebRequestListener() {
		if (!browser.webRequest) {
			return;
		}

		const { grantCookies } = Shared.storage.options;
		if (
			grantCookies &&
			!browser.webRequest.onBeforeSendHeaders.hasListener(this.onBeforeSendHeaders)
		) {
			const filters: WebExtWebRequest.RequestFilter = {
				types: ['xmlhttprequest'],
				urls: [
					'*://*.trakt.tv/*',
					...getServices()
						.map((service) => service.hostPatterns)
						.flat(),
				],
			};
			browser.webRequest.onBeforeSendHeaders.addListener(this.onBeforeSendHeaders, filters, [
				'blocking',
				'requestHeaders',
			]);
		} else if (
			!grantCookies &&
			browser.webRequest.onBeforeSendHeaders.hasListener(this.onBeforeSendHeaders)
		) {
			browser.webRequest.onBeforeSendHeaders.removeListener(this.onBeforeSendHeaders);
		}
	}

	/**
	 * Makes sure cookies are set for requests.
	 */
	onBeforeSendHeaders = ({ requestHeaders }: WebExtWebRequest.BlockingResponse) => {
		if (!requestHeaders) {
			return;
		}
		const utsCookies = requestHeaders.find((header) => header.name.toLowerCase() === 'uts-cookie');
		if (!utsCookies) {
			return;
		}
		requestHeaders = requestHeaders.filter((header) => header.name.toLowerCase() !== 'cookie');
		utsCookies.name = 'Cookie';
		return {
			requestHeaders,
		};
	};

	onRequestsCancel = (data: RequestsCancelData) => {
		this.cancelRequests(data.key);
	};

	cancelRequests(key: string) {
		const abortController = this.abortControllers.get(key);
		if (abortController) {
			abortController.abort();
			this.abortControllers.delete(key);
		}
	}
}

export const RequestsManager = new _RequestsManager();
