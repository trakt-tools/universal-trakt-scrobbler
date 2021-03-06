import axios, { AxiosResponse, CancelTokenSource, Method } from 'axios';
import { TraktAuth } from '../api/TraktAuth';
import { BrowserStorage } from './BrowserStorage';
import { EventDispatcher, RequestsCancelData } from './Events';
import { Messaging } from './Messaging';
import { Shared } from './Shared';

export type RequestException = {
	request: RequestDetails;
	status: number;
	text: string;
	canceled: boolean;
};

export type RequestDetails = {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: unknown;
	cancelKey?: string;
};

class _Requests {
	cancelTokens = new Map<string, CancelTokenSource>();

	startListeners() {
		EventDispatcher.subscribe('REQUESTS_CANCEL', null, this.onRequestsCancel);
	}

	stopListeners() {
		EventDispatcher.unsubscribe('REQUESTS_CANCEL', null, this.onRequestsCancel);
	}

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

	async send(request: RequestDetails, tabId = Shared.tabId): Promise<string> {
		let responseText = '';
		if (
			Shared.pageType === 'background' ||
			(Shared.pageType === 'popup' && tabId !== null) ||
			(Shared.pageType === 'content' && request.url.includes(window.location.host))
		) {
			responseText = await this.sendDirectly(request, tabId);
		} else {
			responseText = await Messaging.toBackground({ action: 'send-request', request });
		}
		return responseText;
	}

	async sendDirectly(request: RequestDetails, tabId = Shared.tabId): Promise<string> {
		let responseStatus = 0;
		let responseText = '';
		try {
			const response = await this.fetch(request, tabId);
			responseStatus = response.status;
			responseText = response.data;
			if (responseStatus < 200 || responseStatus >= 400) {
				throw responseText;
			}
		} catch (err) {
			throw {
				request,
				status: responseStatus,
				text: responseText,
				canceled: err instanceof axios.Cancel,
			};
		}
		return responseText;
	}

	async fetch(request: RequestDetails, tabId = Shared.tabId): Promise<AxiosResponse<string>> {
		const options = await this.getOptions(request, tabId);
		const cancelKey = request.cancelKey || 'default';
		if (!this.cancelTokens.has(cancelKey)) {
			this.cancelTokens.set(cancelKey, axios.CancelToken.source());
		}
		const cancelToken = this.cancelTokens.get(cancelKey)?.token;
		return axios.request({
			url: request.url,
			method: options.method as Method,
			headers: options.headers,
			data: options.body,
			responseType: 'text',
			cancelToken,
			transformResponse: (res: string) => res,
		});
	}

	async getOptions(request: RequestDetails, tabId = Shared.tabId): Promise<RequestInit> {
		return {
			method: request.method,
			headers: await this.getHeaders(request, tabId),
			body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
		};
	}

	async getHeaders(request: RequestDetails, tabId = Shared.tabId): Promise<HeadersInit> {
		const headers: HeadersInit = {
			'Content-Type':
				typeof request.body === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
			...(request.headers || {}),
		};
		if (request.url.includes('trakt.tv')) {
			Object.assign(headers, TraktAuth.getHeaders());
			const values = await BrowserStorage.get('auth');
			if (values.auth && values.auth.access_token) {
				headers['Authorization'] = `Bearer ${values.auth.access_token}`;
			}
		}
		const cookies = await this.getCookies(request, tabId);
		if (cookies) {
			headers['UTS-Cookie'] = cookies;
		}
		return headers;
	}

	async getCookies(request: RequestDetails, tabId = Shared.tabId): Promise<string | undefined> {
		if (tabId === null) {
			return;
		}
		if (!BrowserStorage.options.grantCookies || !browser.cookies || !browser.webRequest) {
			return;
		}
		const domainMatches = /https?:\/\/(www\.)?(.+?)(\/.*)?$/.exec(request.url);
		if (!domainMatches) {
			return;
		}
		const [, , domain] = domainMatches;
		const tab = await browser.tabs.get(tabId);
		const cookies = await browser.cookies.getAll({
			domain,
			storeId: tab.cookieStoreId,
		});
		return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
	}
}

export const Requests = new _Requests();
