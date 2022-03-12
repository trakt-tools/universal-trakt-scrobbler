import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher, RequestsCancelData, StorageOptionsChangeData } from '@common/Events';
import { Shared } from '@common/Shared';
import { getServices } from '@models/Service';
import { CancelTokenSource } from 'axios';
import { RateLimitedAxiosInstance } from 'axios-rate-limit';
import browser, { WebRequest as WebExtWebRequest } from 'webextension-polyfill';

class _RequestsManager {
	cancelTokens = new Map<string, CancelTokenSource>();
	instances = new Map<string, RateLimitedAxiosInstance>();

	init() {
		if (Shared.pageType === 'background') {
			this.checkWebRequestListener();
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, this.onStorageOptionsChange);
		}
		EventDispatcher.subscribe('REQUESTS_CANCEL', null, this.onRequestsCancel);
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

		const { grantCookies } = BrowserStorage.options;
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
		const cancelToken = this.cancelTokens.get(key);
		if (cancelToken) {
			cancelToken.cancel();
			this.cancelTokens.delete(key);
		}
	}
}

export const RequestsManager = new _RequestsManager();
