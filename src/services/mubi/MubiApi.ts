import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { RequestDetails, Requests } from '@common/Requests';
import { MovieItem, ScrobbleItemValues } from '@models/Item';
import { MubiService } from '@/mubi/MubiService';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';

export interface MubiHistoryResponse {
	view_logs: MubiHistoryItem[];
	meta: {
		current_page: number;
		next_page: number | null;
		previous_page: number | null;
		total_pages: number;
		// Some other information, which is not relevant here
	};
}

export interface MubiFilmInfo {
	id: number;
	slug: string;
	title: string;
	title_locale: string;
	original_title: string;
	year: number;
	duration: number;
	web_url: string;
	/** Cover image */
	still_url: string;
	// Some other information, which is not relevant here
}

export interface MubiHistoryItem {
	/** Timestamp like 2022-12-05T17:37:03Z */
	watched_at: string;
	film: MubiFilmInfo;
}

export interface MubiSession extends ServiceApiSession {
	authorizationHeader: string;
	country: string;
}

class _MubiApi extends ServiceApi {
	HOST_URL: string;
	API_URL: string;

	session: MubiSession | null = null;

	constructor() {
		super(MubiService.id);

		this.HOST_URL = 'https://mubi.com';
		this.API_URL = 'https://api.mubi.com/v3';
	}

	async activate() {
		try {
			const responseText = await this.sendRequest({
				url: this.HOST_URL,
				method: 'GET',
			});
			this.session = this.extractSession(responseText);
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log(`Failed to activate ${this.id} API`, err);
			}
			throw new Error('Failed to activate API');
		}
	}

	async checkLogin() {
		if (!this.session) {
			await this.activate();
		}
		return !!this.session;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<MubiHistoryItem[]> {
		if (!this.session) {
			await this.activate();
		}

		let historyItems: MubiHistoryItem[] = [];

		// Retrieve the history items
		const responseText = await this.sendRequest({
			url: `${this.API_URL}/view_logs?page=${this.nextHistoryPage + 1}`,
			method: 'GET',
			cancelKey,
		});
		const responseJson = JSON.parse(responseText) as MubiHistoryResponse;
		historyItems = responseJson?.view_logs ?? [];

		this.nextHistoryPage += 1;
		this.hasReachedHistoryEnd = responseJson?.meta.next_page === null;

		return historyItems;
	}

	getHistoryItemId(historyItem: MubiHistoryItem): string {
		return `${historyItem.film.id}-${historyItem.watched_at}`;
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: MubiHistoryItem): Promisable<void> {
		item.watchedAt = Utils.unix(historyItem.watched_at);
		item.progress = 100;
	}

	isNewHistoryItem(historyItem: MubiHistoryItem, lastSync: number, _lastSyncId: string) {
		const watchedAt = Utils.unix(historyItem.watched_at);
		return watchedAt > lastSync;
	}

	convertHistoryItems(historyItems: MubiHistoryItem[]) {
		const items = historyItems.map((historyItem) => {
			const watchedAt = Utils.unix(historyItem.watched_at);

			// There are only movies, no shows
			return new MovieItem({
				serviceId: this.id,
				id: `${historyItem.film.id}`,
				title: historyItem.film.title,
				year: historyItem.film.year,
				imageUrl: historyItem.film.still_url,
				watchedAt,
				progress: 100,
			});
		});

		return Promise.resolve(items);
	}

	/** Extract the session information from the page */
	extractSession(text: string): MubiSession | null {
		let session: MubiSession | null = null;
		const tokenRegex = /id="__NEXT_DATA__".*?"Authorization":"(?<apiToken>Bearer .*?)"/;
		const profileNameRegex = /id="__NEXT_DATA__".*?"user":\{.*?"name":"(?<profileName>.*?)"/;
		const countryRegex = /id="__NEXT_DATA__".*?"country":"(?<country>\w*?)"/;
		const { apiToken } = tokenRegex.exec(text)?.groups ?? {};
		const { profileName = null } = profileNameRegex.exec(text)?.groups ?? {};
		const { country = 'US' } = countryRegex.exec(text)?.groups ?? {};
		if (apiToken) {
			session = { authorizationHeader: apiToken, profileName, country };
		}
		return session;
	}

	private async sendRequest(
		request: RequestDetails,
		tabId?: number | null,
		isRetry = false
	): ReturnType<typeof Requests.send> {
		request = {
			headers: {
				CLIENT: 'web',
				CLIENT_COUNTRY: this.session?.country || 'US',
				Authorization: this.session?.authorizationHeader || '',
				...request.headers,
			},
			...request,
		};
		try {
			return await Requests.send(request, tabId);
		} catch (err) {
			// We need to do this to make the linter happy, because `err` is unknown
			const errMessage =
				typeof err === 'object' && err && 'message' in err ? (err.message as string) : '';
			// If the login expired and we have not retried, retry
			if (!isRetry && errMessage.includes('\\"message\\":\\"Invalid login token\\"')) {
				await this.activate();
				return this.sendRequest(request, tabId, true);
			}
			throw err;
		}
	}

	async getItem(id: string): Promise<MovieItem | null> {
		if (!this.session) {
			await this.activate();
		}

		try {
			const responseText = await this.sendRequest({
				url: `${this.API_URL}/films/${id}`,
				method: 'GET',
			});

			const film = JSON.parse(responseText) as MubiFilmInfo;

			return new MovieItem({
				serviceId: this.id,
				id: `${film.id}`,
				title: film.title,
				year: film.year,
				imageUrl: film.still_url,
			});
		} catch (err) {
			// To make the linter happy
			const error = err instanceof Error ? err : new Error();
			Shared.errors.log(`Failed to get item ${id} through ${this.id} API`, error);
			return null;
		}
	}
}

export const MubiApi = new _MubiApi();
