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

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

class _Requests {
	send = async (request: RequestDetails, tabId = 0): Promise<string> => {
		let responseText = '';
		if (
			Shared.pageType === 'background' ||
			(Shared.pageType === 'popup' && tabId) ||
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

	sendDirectly = async (request: RequestDetails, tabId = 0): Promise<string> => {
		let responseStatus = 0;
		let responseText = '';
		try {
			const response = await this.fetch(request, tabId);
			responseStatus = response.status;
			responseText = await response.text();
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

	fetch = async (request: RequestDetails, tabId = 0): Promise<Response> => {
		let fetch = window.fetch;
		let options = await this.getOptions(request, tabId);
		if (window.wrappedJSObject) {
			// Firefox wraps page objects, so if we want to send the request from a container, we have to unwrap them.
			fetch = XPCNativeWrapper(window.wrappedJSObject.fetch);
			window.wrappedJSObject.fetchOptions = cloneInto(options, window);
			options = XPCNativeWrapper(window.wrappedJSObject.fetchOptions);
		}
		return fetch(request.url, options);
	};

	getOptions = async (request: RequestDetails, tabId = 0): Promise<RequestInit> => {
		return {
			method: request.method,
			headers: await this.getHeaders(request, tabId),
			body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
		};
	};

	getHeaders = async (request: RequestDetails, tabId = 0): Promise<HeadersInit> => {
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

	getCookies = async (request: RequestDetails, tabId = 0): Promise<string | undefined> => {
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
