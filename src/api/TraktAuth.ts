import { secrets } from '../secrets';
import { BrowserStorage } from '../common/BrowserStorage';
import { Requests } from '../common/Requests';
import { Shared } from '../common/Shared';
import { Tabs } from '../common/Tabs';
import { TraktApi } from './TraktApi';

export type TraktManualAuth = {
	callback?: PromiseResolve<TraktAuthDetails>;
	tabId?: number;
};

export type TraktAuthDetails = {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
	created_at: number;
};

class _TraktAuth extends TraktApi {
	isIdentityAvailable: boolean;
	manualAuth: TraktManualAuth;

	constructor() {
		super();

		this.isIdentityAvailable = !!browser.identity;
		this.manualAuth = {};
	}

	getHeaders = (): Record<string, unknown> => {
		return {
			'trakt-api-key': secrets.clientId,
			'trakt-api-version': this.API_VERSION,
		};
	};

	getAuthorizeUrl = (): string => {
		return `${this.AUTHORIZE_URL}?response_type=code&client_id=${
			secrets.clientId
		}&redirect_uri=${this.getRedirectUrl()}`;
	};

	getRedirectUrl = (): string => {
		return this.isIdentityAvailable ? browser.identity.getRedirectURL() : this.REDIRECT_URL;
	};

	getCode = (redirectUrl: string): string => {
		return redirectUrl.split('?')[1].split('=')[1];
	};

	hasTokenExpired = (auth: TraktAuthDetails): boolean => {
		const now = Date.now() / 1e3;
		return auth.created_at + auth.expires_in < now;
	};

	authorize = (): Promise<TraktAuthDetails> => {
		let promise: Promise<TraktAuthDetails>;
		let requiresCookies = false;
		if (Shared.browser === 'firefox') {
			requiresCookies = !!BrowserStorage.options.grantCookies;
		}
		if (this.isIdentityAvailable && !requiresCookies) {
			promise = this.startIdentityAuth();
		} else {
			promise = new Promise<TraktAuthDetails>((resolve) => void this.startManualAuth(resolve));
		}
		return promise;
	};

	startIdentityAuth = async (): Promise<TraktAuthDetails> => {
		try {
			const redirectUrl = await browser.identity.launchWebAuthFlow({
				url: this.getAuthorizeUrl(),
				interactive: true,
			});
			return this.getToken(redirectUrl);
		} catch (err) {
			this.isIdentityAvailable = false;
			return new Promise<TraktAuthDetails>((resolve) => void this.startManualAuth(resolve));
		}
	};

	startManualAuth = async (callback: PromiseResolve<TraktAuthDetails>): Promise<void> => {
		this.manualAuth.callback = callback;
		const tab = await Tabs.open(this.getAuthorizeUrl());
		if (tab) {
			this.manualAuth.tabId = tab.id;
		}
	};

	finishManualAuth = async (redirectUrl: string): Promise<void> => {
		if (typeof this.manualAuth.tabId !== 'undefined') {
			await browser.tabs.remove(this.manualAuth.tabId);
		}
		const auth = await this.getToken(redirectUrl);
		this.manualAuth.callback?.(auth);
		this.manualAuth = {};
	};

	getToken = (redirectUrl: string): Promise<TraktAuthDetails> => {
		return this.requestToken({
			code: this.getCode(redirectUrl),
			client_id: secrets.clientId,
			client_secret: secrets.clientSecret,
			redirect_uri: this.getRedirectUrl(),
			grant_type: 'authorization_code',
		});
	};

	refreshToken = (refreshToken: string): Promise<TraktAuthDetails> => {
		return this.requestToken({
			refresh_token: refreshToken,
			client_id: secrets.clientId,
			client_secret: secrets.clientSecret,
			redirect_uri: this.getRedirectUrl(),
			grant_type: 'refresh_token',
		});
	};

	requestToken = async (data: Record<string, unknown>): Promise<TraktAuthDetails> => {
		let auth: TraktAuthDetails;
		try {
			const responseText = await Requests.send({
				url: this.REQUEST_TOKEN_URL,
				method: 'POST',
				body: data,
			});
			auth = JSON.parse(responseText) as TraktAuthDetails;
			await BrowserStorage.set({ auth }, true);
		} catch (err) {
			await BrowserStorage.remove('auth', true);
			throw err;
		}
		return auth;
	};

	revokeToken = async (): Promise<void> => {
		const values = await BrowserStorage.get('auth');
		await Requests.send({
			url: this.REVOKE_TOKEN_URL,
			method: 'POST',
			body: {
				access_token: values.auth?.access_token,
				client_id: secrets.clientId,
				client_secret: secrets.clientSecret,
			},
		});
		await BrowserStorage.remove('auth', true);
	};

	validateToken = async (): Promise<TraktAuthDetails | undefined> => {
		let auth: TraktAuthDetails | undefined;
		const values = await BrowserStorage.get('auth');
		if (values.auth && values.auth.refresh_token && this.hasTokenExpired(values.auth)) {
			auth = await this.refreshToken(values.auth.refresh_token);
		} else {
			auth = values.auth;
		}
		return auth;
	};
}

export const TraktAuth = new _TraktAuth();
