class TraktApi {
  API_VERSION: string;
  HOST_URL: string;
  API_URL: string;
  AUTHORIZE_URL: string;
  REDIRECT_URL: string;
  REQUEST_TOKEN_URL: string;
  REVOKE_TOKEN_URL: string;
  SEARCH_URL: string;
  SHOWS_URL: string;
  SYNC_URL: string;

  constructor() {
    this.API_VERSION = '2';
    this.HOST_URL = 'https://trakt.tv';
    this.API_URL = 'https://api.trakt.tv';
    this.AUTHORIZE_URL = `${this.HOST_URL}/oauth/authorize`;
    this.REDIRECT_URL = `${this.HOST_URL}/apps`;
    this.REQUEST_TOKEN_URL = `${this.API_URL}/oauth/token`;
    this.REVOKE_TOKEN_URL = `${this.API_URL}/oauth/revoke`;
    this.SEARCH_URL = `${this.API_URL}/search`;
    this.SHOWS_URL = `${this.API_URL}/shows`;
    this.SYNC_URL = `${this.API_URL}/sync/history`;
  }
}

export { TraktApi };