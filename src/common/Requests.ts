import { Messaging } from '@common/Messaging';
import { RequestError } from '@common/RequestError';
import { RequestsManager } from '@common/RequestsManager';
import { Shared } from '@common/Shared';
import browser from 'webextension-polyfill';

export type RequestDetails = {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
	cancelKey?: string;
	withHeaders?: Record<string, string>;
};

export interface RequestOptions {
	method: RequestInit['method'];
	headers: Record<string, string>;
	body: RequestInit['body'];
}

class _Requests {
	readonly withHeaders: Record<string, string> = {};

	async send(request: RequestDetails, tabId = Shared.tabId): Promise<string> {
		return new Promise((resolve, reject) => {
			if (Shared.pageType === 'background') {
				void this.sendDirectly(request, tabId, resolve, reject);
			} else {
				// All requests from other pages must be sent to the background page to bypass CORS
				request.withHeaders = this.withHeaders;
				Messaging.toExtension({ action: 'send-request', request }).then(resolve).catch(reject);
			}
		});
	}

	async sendDirectly(
		request: RequestDetails,
		tabId = Shared.tabId,
		resolve: PromiseResolve<string>,
		reject: PromiseReject
	): Promise<void> {
		let responseStatus = 0;
		let responseText = '';
		try {
			const response = await this.fetch(request, tabId);
			responseStatus = response.status;
			responseText = await response.text();

			// Check for Cloudflare rate limiting HTML response
			if (responseText.includes('Cloudflare') && responseText.includes('Ray ID:')) {
				// Extract error code if present (e.g., Error 1015)
				const errorMatch = responseText.match(/Error\s*(\d+)/);
				const errorCode = errorMatch ? errorMatch[1] : 'unknown';

				// Set appropriate status code for rate limiting
				if (responseText.includes('rate limit') || errorCode === '1015') {
					responseStatus = 429; // Use standard rate limit status
					// Cloudflare doesn't provide Retry-After header in HTML error pages
					// Use a reasonable default wait time (60 seconds)
					const retryAfter = 60000;
					console.warn(
						`Cloudflare rate limit detected (Error ${errorCode}). Retrying in ${retryAfter / 1000}s`
					);
					setTimeout(() => void this.sendDirectly(request, tabId, resolve, reject), retryAfter);
					return;
				}

				responseStatus = responseStatus || 503;
				throw `Cloudflare blocked request (Error ${errorCode})`;
			}

			if (responseStatus === 429) {
				const retryAfterStr = response.headers.get('Retry-After');
				if (retryAfterStr) {
					const retryAfter = Number.parseInt(retryAfterStr) * 1000;
					setTimeout(() => void this.sendDirectly(request, tabId, resolve, reject), retryAfter);
					return;
				}
			}
			if (responseStatus < 200 || responseStatus >= 400) {
				throw responseText;
			}
		} catch (err) {
			// Handle manually thrown errors from above (where status >= 400)
			if (typeof err === 'string' && responseStatus >= 400) {
				reject(
					new RequestError({
						request,
						status: responseStatus, // Use the captured status code
						text: responseText,
						isCanceled: request.signal?.aborted ?? false,
					})
				);
				return;
			}

			let errRespStatus = -1;
			let errRespData: undefined | string = undefined;

			// Attempt to extract status from error object if it mimics axios/similar structure, or default to -1
			if (
				typeof err === 'object' &&
				err &&
				'response' in err &&
				typeof (err as any).response === 'object' &&
				(err as any).response
			) {
				const errAny = err as any;
				if ('status' in errAny.response) errRespStatus = errAny.response.status as number;
				if ('data' in errAny.response) errRespData = errAny.response.data as string;
			}

			reject(
				new RequestError({
					request,
					status: errRespStatus,
					text: errRespData,
					isCanceled: request.signal?.aborted ?? false,
				})
			);
			return;
		}
		resolve(responseText);
	}

	async fetch(request: RequestDetails, tabId = Shared.tabId): Promise<Response> {
		const options = await this.getOptions(request, tabId);

		const cancelKey = `${tabId !== null ? `${tabId}_` : ''}${request.cancelKey || 'default'}`;
		if (!RequestsManager.abortControllers.has(cancelKey)) {
			RequestsManager.abortControllers.set(cancelKey, new AbortController());
		}
		request.signal = RequestsManager.abortControllers.get(cancelKey)?.signal;

		return fetch(request.url, {
			method: options.method,
			headers: options.headers,
			body: options.body,
			signal: request.signal,
		});
	}

	async getOptions(request: RequestDetails, tabId = Shared.tabId): Promise<RequestOptions> {
		return {
			method: request.method,
			headers: await this.getHeaders(request, tabId),
			body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
		};
	}

	async getHeaders(request: RequestDetails, tabId = Shared.tabId): Promise<Record<string, string>> {
		const headers: Record<string, string> = {
			...this.withHeaders,
			...(request.withHeaders || {}),
			'Content-Type':
				typeof request.body === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
			...(request.headers || {}),
		};
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
		if (!Shared.storage.options.grantCookies || !browser.cookies || !browser.webRequest) {
			return;
		}
		const domainMatches = /https?:\/\/(?:www\.)?(?<domain>.+?)(?:\/.*)?$/.exec(request.url);
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
}

export const Requests = new _Requests();

/**
 * Creates a proxy to a requests instance that uses the provided headers. Useful for making authenticated requests without having to provide the authentication headers every time.
 */
export const withHeaders = (headers: Record<string, string>, instance = Requests) => {
	return new Proxy(instance, {
		get: (target, prop, receiver) => {
			if (prop === 'withHeaders') {
				return { ...instance.withHeaders, ...headers };
			}
			return Reflect.get(target, prop, receiver) as unknown;
		},
	});
};
