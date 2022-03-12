import { TraktAuth } from '@apis/TraktAuth';
import { BrowserStorage } from '@common/BrowserStorage';
import { Messaging } from '@common/Messaging';
import { RequestsManager } from '@common/RequestsManager';
import { Shared } from '@common/Shared';
import axios, { AxiosResponse, Method } from 'axios';
import axiosRateLimit from 'axios-rate-limit';
import browser from 'webextension-polyfill';

export interface RequestErrorOptions {
	request?: RequestDetails;
	status?: number;
	text?: string;
	isCanceled?: boolean;
	extra?: Record<string, unknown>;
}

export class RequestError extends Error {
	request?: RequestDetails;
	status?: number;
	text?: string;
	isCanceled?: boolean;
	extra?: Record<string, unknown>;

	constructor(options: RequestErrorOptions) {
		super(JSON.stringify(options));

		this.request = options.request;
		this.status = options.status;
		this.text = options.text;
		this.isCanceled = options.isCanceled;
		this.extra = options.extra;
	}
}

export type RequestDetails = {
	url: string;
	method: string;
	headers?: Record<string, string>;
	rateLimit?: RateLimit;
	body?: unknown;
	cancelKey?: string;
	withHeaders?: Record<string, string>;
	withRateLimit?: RateLimitConfig;
};

export interface RateLimit {
	id: string;
	maxRPS: number;
}

export interface RateLimitConfig {
	/** All requests with the same ID will be limited by the same instance. */
	id: string;

	/** Maximum requests per second. */
	maxRPS: {
		/** This limit will apply to all methods, unless a limit for the specific method has been provided. */
		'*': number;

		/** This limit will apply to the specific method. */
		[K: string]: number | undefined;
	};
}

class _Requests {
	readonly withHeaders: Record<string, string> = {};
	readonly withRateLimit: RateLimitConfig = {
		id: 'default',
		maxRPS: {
			'*': 2,
		},
	};

	async send(request: RequestDetails, tabId = Shared.tabId): Promise<string> {
		let responseText = '';
		if (Shared.pageType === 'background') {
			responseText = await this.sendDirectly(request, tabId);
		} else {
			// All requests from other pages must be sent to the background page so that it can rate limit them
			request.withHeaders = this.withHeaders;
			request.withRateLimit = this.withRateLimit;
			responseText = await Messaging.toExtension({ action: 'send-request', request });
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
			throw new RequestError({
				request,
				status: responseStatus,
				text: responseText,
				isCanceled: err instanceof axios.Cancel,
			});
		}
		return responseText;
	}

	async fetch(request: RequestDetails, tabId = Shared.tabId): Promise<AxiosResponse<string>> {
		const options = await this.getOptions(request, tabId);
		const cancelKey = request.cancelKey || 'default';
		if (!RequestsManager.cancelTokens.has(cancelKey)) {
			RequestsManager.cancelTokens.set(cancelKey, axios.CancelToken.source());
		}
		const cancelToken = RequestsManager.cancelTokens.get(cancelKey)?.token;

		const rateLimit = request.rateLimit ?? this.getRateLimit(request);
		let instance = RequestsManager.instances.get(rateLimit.id);
		if (!instance) {
			instance = axiosRateLimit(axios.create(), { maxRPS: rateLimit.maxRPS });
			RequestsManager.instances.set(rateLimit.id, instance);
		}

		return instance.request({
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
			...this.withHeaders,
			...(request.withHeaders || {}),
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
		const domainMatches = /https?:\/\/(?:www\.)?(?:.+?)(?<domain>\/.*)?$/.exec(request.url);
		if (!domainMatches?.groups) {
			return;
		}
		const { domain } = domainMatches.groups;
		const tab = await browser.tabs.get(tabId);
		const cookies = await browser.cookies.getAll({
			domain,
			storeId: tab.cookieStoreId,
		});
		return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
	}

	getRateLimit(request: RequestDetails) {
		let id;
		let maxRPS;

		if (request.withRateLimit) {
			id = request.withRateLimit.id;
			maxRPS = request.withRateLimit.maxRPS[request.method];

			if (maxRPS) {
				return {
					id: `${id}_${request.method}`,
					maxRPS,
				};
			}

			maxRPS = request.withRateLimit.maxRPS['*'];

			return { id, maxRPS };
		}

		id = this.withRateLimit.id;
		maxRPS = this.withRateLimit.maxRPS[request.method];

		if (maxRPS) {
			return {
				id: `${id}_${request.method}`,
				maxRPS,
			};
		}

		maxRPS = this.withRateLimit.maxRPS['*'];

		return { id, maxRPS };
	}
}

export const Requests = new _Requests();

/**
 * Creates a proxy to a requests instance that uses the provided headers. Useful for making authenticated requests without having to provide the authentication headers every time.
 */
export const withHeaders = (headers: Record<string, string>, instance = Requests) => {
	return new Proxy(instance, {
		get: (target, prop, receiver) => {
			if (prop === 'withHeaders') {
				return headers;
			}
			return Reflect.get(target, prop, receiver) as unknown;
		},
	});
};

/**
 * Creates a proxy to a requests instance that uses the provided rate limit. Useful for making requests without having to provide the rate limit every time.
 */
export const withRateLimit = (rateLimit: RateLimitConfig, instance = Requests) => {
	return new Proxy(instance, {
		get: (target, prop, receiver) => {
			if (prop === 'withRateLimit') {
				return rateLimit;
			}
			return Reflect.get(target, prop, receiver) as unknown;
		},
	});
};
