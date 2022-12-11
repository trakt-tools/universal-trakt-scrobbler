import { Requests, withHeaders } from '@common/Requests';
import { Shared } from '@common/Shared';

export class TraktApi {
	API_VERSION: string;
	HOST_URL: string;
	API_URL: string;
	AUTHORIZE_URL: string;
	REDIRECT_URL: string;
	REQUEST_TOKEN_URL: string;
	REVOKE_TOKEN_URL: string;
	SEARCH_URL: string;
	SHOWS_URL: string;
	SCROBBLE_URL: string;
	SYNC_URL: string;
	SETTINGS_URL: string;

	requests = Requests;

	isActivated = false;

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
		this.SCROBBLE_URL = `${this.API_URL}/scrobble`;
		this.SYNC_URL = `${this.API_URL}/sync/history`;
		this.SETTINGS_URL = `${this.API_URL}/users/settings`;
	}

	async activate(): Promise<void> {
		if (this.isActivated) {
			return;
		}

		const headers: Record<string, string> = {
			'trakt-api-key': Shared.clientId,
			'trakt-api-version': this.API_VERSION,
		};
		const values = await Shared.storage.get('auth');
		if (values.auth?.access_token) {
			headers['Authorization'] = `Bearer ${values.auth.access_token}`;
		}

		this.requests = withHeaders(headers, this.requests);

		this.isActivated = true;
	}
}
