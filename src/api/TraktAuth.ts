import { secrets } from '../secrets';
import { BrowserStorage } from '../services/BrowserStorage';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

class _TraktAuth extends TraktApi {
  isIdentityAvailable: boolean;
  manualAuth: TraktManualAuth;

  constructor() {
    super();

    this.isIdentityAvailable = !!browser.identity;
    this.manualAuth = {
      callback: null,
      tabId: 0,
    };

    this.getHeaders = this.getHeaders.bind(this);
    this.getAuthorizeUrl = this.getAuthorizeUrl.bind(this);
    this.getRedirectUrl = this.getRedirectUrl.bind(this);
    this.getCode = this.getCode.bind(this);
    this.hasTokenExpired = this.hasTokenExpired.bind(this);
    this.authorize = this.authorize.bind(this);
    this.startIdentityAuth = this.startIdentityAuth.bind(this);
    this.startManualAuth = this.startManualAuth.bind(this);
    this.finishManualAuth = this.finishManualAuth.bind(this);
    this.getToken = this.getToken.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.requestToken = this.requestToken.bind(this);
    this.revokeToken = this.revokeToken.bind(this);
    this.validateToken = this.validateToken.bind(this);
  }

  getHeaders(): GenericObject {
    return {
      'trakt-api-key': secrets.clientId,
      'trakt-api-version': this.API_VERSION,
    };
  }

  getAuthorizeUrl(): string {
    return `${this.AUTHORIZE_URL}?response_type=code&client_id=${secrets.clientId}&redirect_uri=${this.getRedirectUrl()}`;
  }

  getRedirectUrl(): string {
    return this.isIdentityAvailable ? browser.identity.getRedirectURL() : this.REDIRECT_URL;
  }

  getCode(redirectUrl: string): string {
    return redirectUrl
      .split('?')[1]
      .split('=')[1];
  }

  hasTokenExpired(auth: TraktAuthDetails): boolean {
    const now = Date.now() / 1e3;
    return auth.created_at + auth.expires_in < now;
  }

  async authorize(): Promise<TraktAuthDetails> {
    let promise: Promise<TraktAuthDetails> = null;
    if (this.isIdentityAvailable) {
      promise = this.startIdentityAuth();
    } else {
      promise = new Promise(this.startManualAuth);
    }
    return promise;
  }

  async startIdentityAuth(): Promise<TraktAuthDetails> {
    const redirectUrl = await browser.identity.launchWebAuthFlow({
      url: this.getAuthorizeUrl(),
      interactive: true,
    });
    return this.getToken(redirectUrl);
  }

  async startManualAuth(callback: Function): Promise<void> {
    this.manualAuth.callback = callback;
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = await browser.tabs.create({
      url: this.getAuthorizeUrl(),
      index: tabs[0].index,
    });
    this.manualAuth.tabId = tab.id;
  }

  async finishManualAuth(redirectUrl: string): Promise<void> {
    await browser.tabs.remove(this.manualAuth.tabId);
    const auth = await this.getToken(redirectUrl);
    this.manualAuth.callback(auth);
    this.manualAuth = {
      callback: null,
      tabId: 0,
    };
  }

  getToken(redirectUrl: string): Promise<TraktAuthDetails> {
    return this.requestToken({
      code: this.getCode(redirectUrl),
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'authorization_code',
    });
  }

  refreshToken(refreshToken: string): Promise<TraktAuthDetails> {
    return this.requestToken({
      refresh_token: refreshToken,
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'refresh_token',
    });
  }

  async requestToken(data: GenericObject): Promise<TraktAuthDetails> {
    let auth: TraktAuthDetails = null;
    try {
      const responseText = await Requests.send({
        url: this.REQUEST_TOKEN_URL,
        method: 'POST',
        body: data,
      });
      auth = JSON.parse(responseText);
      await BrowserStorage.set({ auth }, true);
    } catch (err) {
      await BrowserStorage.remove('auth', true);
      throw err;
    }
    return auth;
  }

  async revokeToken(): Promise<void> {
    const values = await BrowserStorage.get('auth');
    await Requests.send({
      url: this.REVOKE_TOKEN_URL,
      method: 'POST',
      body: {
        access_token: values.auth.access_token,
        client_id: secrets.clientId,
        client_secret: secrets.clientSecret,
      },
    });
    await BrowserStorage.remove('auth', true);
  }

  async validateToken(): Promise<TraktAuthDetails> {
    let auth: TraktAuthDetails = null;
    const values = await BrowserStorage.get('auth');
    if (values.auth && values.auth.refresh_token && this.hasTokenExpired(values.auth)) {
      auth = await this.refreshToken(values.auth.refresh_token);
    } else {
      auth = values.auth;
    }
    return auth;
  }
}

const TraktAuth = new _TraktAuth();

export { TraktAuth };