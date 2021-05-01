import axios, { AxiosResponse, Method } from 'axios';
import { TraktAuth } from '../api/TraktAuth';
import { BrowserStorage } from './BrowserStorage';
import { Messaging } from './Messaging';
import { Shared } from './Shared';

export type RequestException = {
	request: RequestDetails;
	status: number;
	text: string;
};

export type RequestDetails = {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: unknown;
};

class _Requests {
	send = async (request: RequestDetails, tabId = Shared.tabId): Promise<string> => {
		let responseText = '';
		if (
			Shared.pageType === 'background' ||
			(Shared.pageType === 'popup' && typeof tabId !== 'undefined') ||
			(Shared.pageType === 'content' && request.url.includes(window.location.host))
		) {
			responseText = await this.sendDirectly(request, tabId);
		} else {
			const response = await Messaging.toBackground({ action: 'send-request', request });
			responseText = (response as unknown) as string;
			if (response.error) {
				throw response.error;
			}
		}
		return responseText;
	};

	sendDirectly = async (request: RequestDetails, tabId = Shared.tabId): Promise<string> => {
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
			};
		}
		return responseText;
	};

	fetch = async (request: RequestDetails, tabId = Shared.tabId): Promise<AxiosResponse> => {
		let options = await this.getOptions(request, tabId);
		return axios.request({
			url: request.url,
			method: options.method as Method,
			headers: options.headers,
			data: options.body,
			responseType: 'text',
			transformResponse: (res) => res,
		});
	};

	getOptions = async (request: RequestDetails, tabId = Shared.tabId): Promise<RequestInit> => {
		return {
			method: request.method,
			headers: await this.getHeaders(request, tabId),
			body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
		};
	};

	getHeaders = async (request: RequestDetails, tabId = Shared.tabId): Promise<HeadersInit> => {
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
	};

	getCookies = async (
		request: RequestDetails,
		tabId = Shared.tabId
	): Promise<string | undefined> => {
		if (typeof tabId === 'undefined') {
			return;
		}
		const storage = await BrowserStorage.get('options');
		if (!storage.options?.grantCookies || !browser.cookies || !browser.webRequest) {
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
	};
}

export const Requests = new _Requests();
