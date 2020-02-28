import { secrets } from '../secrets';
import { BrowserStorage } from '../services/BrowserStorage';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

class _TraktAuth extends TraktApi {
  constructor() {
    super();

    this.isIdentityAvailable = !!browser.identity;
    /** @type {TraktManualAuth} */
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

  /**
   * @returns {Object<string, string>}
   */
  getHeaders() {
    return {
      'trakt-api-key': secrets.clientId,
      'trakt-api-version': this.API_VERSION,
    };
  }

  /**
   * @returns {string}
   */
  getAuthorizeUrl() {
    return `${this.AUTHORIZE_URL}?response_type=code&client_id=${secrets.clientId}&redirect_uri=${this.getRedirectUrl()}`;
  }

  /**
   * @returns {string}
   */
  getRedirectUrl() {
    return this.isIdentityAvailable ? browser.identity.getRedirectURL() : this.REDIRECT_URL;
  }

  /**
   * @param {string} redirectUrl
   * @returns {string}
   */
  getCode(redirectUrl) {
    return redirectUrl
      .split('?')[1]
      .split('=')[1];
  }

  /**
   * @param {TraktAuthDetails} auth
   * @returns {boolean}
   */
  hasTokenExpired(auth) {
    const now = Date.now() / 1e3;
    return auth.created_at + auth.expires_in < now;
  }

  /**
   * @returns {Promise<TraktAuthDetails>}
   */
  async authorize() {
    let promise = null;
    if (this.isIdentityAvailable) {
      promise = this.startIdentityAuth();
    } else {
      promise = new Promise(this.startManualAuth);
    }
    return promise;
  }

  /**
   * @returns {Promise<TraktAuthDetails>}
   */
  async startIdentityAuth() {
    const redirectUrl = await browser.identity.launchWebAuthFlow({
      url: this.getAuthorizeUrl(),
      interactive: true,
    });
    return this.getToken(redirectUrl);
  }

  /**
   * @param {Function} callback
   * @returns {Promise}
   */
  async startManualAuth(callback) {
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

  /**
   * @param {string} redirectUrl
   * @returns {Promise}
   */
  async finishManualAuth(redirectUrl) {
    await browser.tabs.remove(this.manualAuth.tabId);
    const auth = await this.getToken(redirectUrl);
    this.manualAuth.callback(auth);
    this.manualAuth = {
      callback: null,
      tabId: 0,
    };
  }

  /**
   * @param {string} redirectUrl
   * @returns {Promise<TraktAuthDetails>}
   */
  getToken(redirectUrl) {
    return this.requestToken({
      code: this.getCode(redirectUrl),
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'authorization_code',
    });
  }

  /**
   * @param {string} refreshToken
   * @returns {Promise<TraktAuthDetails>}
   */
  refreshToken(refreshToken) {
    return this.requestToken({
      refresh_token: refreshToken,
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      redirect_uri: this.getRedirectUrl(),
      grant_type: 'refresh_token',
    });
  }

  /**
   * @param {Object<string, string>} data
   * @returns {Promise<TraktAuthDetails>}
   */
  async requestToken(data) {
    /** @type {TraktAuthDetails} */
    let auth = null;
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

  /**
   * @returns {Promise}
   */
  async revokeToken() {
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

  /**
   * @returns {Promise<TraktAuthDetails>}
   */
  async validateToken() {
    /** @type {TraktAuthDetails} */
    let auth = null;
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