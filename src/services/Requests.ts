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
	body?: string | Record<string, unknown>;
};

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

class _Requests {
	send = async (request: RequestDetails): Promise<string> => {
		let responseText = '';
		if (Shared.isBackgroundPage || request.url.includes(window.location.host)) {
			responseText = await this.sendDirectly(request);
		} else {
			const response = await Messaging.toBackground({ action: 'send-request', request });
			responseText = (response as unknown) as string;
			if (response.error) {
				throw response.error;
			}
		}
		return responseText;
	};

	sendDirectly = async (request: RequestDetails): Promise<string> => {
		let responseStatus = 0;
		let responseText = '';
		try {
			const response = await this.fetch(request);
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

	fetch = async (request: RequestDetails): Promise<Response> => {
		let fetch = window.fetch;
		let options = await this.getOptions(request);
		if (window.wrappedJSObject) {
			// Firefox wraps page objects, so if we want to send the request from a container, we have to unwrap them.
			fetch = XPCNativeWrapper(window.wrappedJSObject.fetch as Fetch);
			window.wrappedJSObject.fetchOptions = cloneInto(options, window);
			options = XPCNativeWrapper(window.wrappedJSObject.fetchOptions as Record<string, unknown>);
		}
		return fetch(request.url, options);
	};

	getOptions = async (request: RequestDetails): Promise<Record<string, unknown>> => {
		return {
			method: request.method,
			headers: await this.getHeaders(request),
			body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
		};
	};

	getHeaders = async (request: RequestDetails): Promise<Record<string, unknown>> => {
		const headers: Record<string, unknown> = {
			'Content-Type':
				typeof request.body === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
		};
		if (request.url.includes('trakt.tv')) {
			Object.assign(headers, TraktAuth.getHeaders());
			const values = await BrowserStorage.get('auth');
			if (values.auth && values.auth.access_token) {
				headers['Authorization'] = `Bearer ${values.auth.access_token}`;
			}
		}
		return headers;
	};
}

export const Requests = new _Requests();
