import { TraktApi } from '@apis/TraktApi';
import { Messaging } from '@common/Messaging';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';
import { Utils } from '@common/Utils';
import browser from 'webextension-polyfill';

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

	requiresCookies(): boolean {
		return Shared.browser === 'firefox' ? !!Shared.storage.options.grantCookies : false;
	}

	getAuthorizeUrl(): string {
		return `${this.AUTHORIZE_URL}?response_type=code&client_id=${
			Shared.clientId
		}&redirect_uri=${this.getRedirectUrl()}`;
	}

	getRedirectUrl(): string {
		return this.isIdentityAvailable && !this.requiresCookies()
			? browser.identity.getRedirectURL()
			: this.REDIRECT_URL;
	}

	getCode(redirectUrl: string): string {
		return redirectUrl.split('?')[1].split('=')[1];
	}

	hasTokenExpired(auth: TraktAuthDetails): boolean {
		const now = Utils.unix();
		return auth.created_at + auth.expires_in < now;
	}

	authorize(): Promise<TraktAuthDetails> {
		let promise: Promise<TraktAuthDetails>;
		if (this.isIdentityAvailable && !this.requiresCookies()) {
			promise = this.startIdentityAuth();
		} else {
			promise = new Promise<TraktAuthDetails>((resolve) => void this.startManualAuth(resolve));
		}
		return promise;
	}

	async startIdentityAuth(): Promise<TraktAuthDetails> {
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
	}

	async startManualAuth(callback: PromiseResolve<TraktAuthDetails>): Promise<void> {
		this.manualAuth.callback = callback;
		const tab = await Tabs.open(this.getAuthorizeUrl());
		if (tab) {
			this.manualAuth.tabId = tab.id;
		}
	}

	async finishManualAuth(redirectUrl: string): Promise<void> {
		if (typeof this.manualAuth.tabId !== 'undefined') {
			await browser.tabs.remove(this.manualAuth.tabId);
		}
		const auth = await this.getToken(redirectUrl);
		this.manualAuth.callback?.(auth);
		this.manualAuth = {};
	}

	getToken(redirectUrl: string): Promise<TraktAuthDetails> {
		return this.requestToken({
			code: this.getCode(redirectUrl),
			client_id: Shared.clientId,
			client_secret: Shared.clientSecret,
			redirect_uri: this.getRedirectUrl(),
			grant_type: 'authorization_code',
		});
	}

	refreshToken(refreshToken: string): Promise<TraktAuthDetails> {
		return this.requestToken({
			refresh_token: refreshToken,
			client_id: Shared.clientId,
			client_secret: Shared.clientSecret,
			redirect_uri: this.getRedirectUrl(),
			grant_type: 'refresh_token',
		});
	}

	async requestToken(data: Record<string, unknown>): Promise<TraktAuthDetails> {
		let auth: TraktAuthDetails;
		try {
			await this.activate();
			const responseText = await this.requests.send({
				url: this.REQUEST_TOKEN_URL,
				method: 'POST',
				body: data,
			});
			auth = JSON.parse(responseText) as TraktAuthDetails;
			await Shared.storage.set({ auth }, true);
		} catch (err) {
			await Shared.storage.remove('auth', true);
			throw err;
		}
		return auth;
	}

	async revokeToken(): Promise<void> {
		const values = await Shared.storage.get('auth');
		await this.activate();
		await this.requests.send({
			url: this.REVOKE_TOKEN_URL,
			method: 'POST',
			body: {
				access_token: values.auth?.access_token,
				client_id: Shared.clientId,
				client_secret: Shared.clientSecret,
			},
		});
		await Shared.storage.remove('auth', true);
	}

	async validateToken(): Promise<TraktAuthDetails | null> {
		if (Shared.pageType !== 'background') {
			return Messaging.toExtension({ action: 'validate-trakt-token' });
		}
		let auth: TraktAuthDetails | null = null;
		const values = await Shared.storage.get('auth');
		if (values.auth) {
			if (values.auth.refresh_token && this.hasTokenExpired(values.auth)) {
				auth = await this.refreshToken(values.auth.refresh_token);
			} else {
				auth = values.auth;
			}
		}
		return auth;
	}
}

export const TraktAuth = new _TraktAuth();
