import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { EpisodeItem, ScrobbleItem } from '@models/Item';
import { CrunchyrollService } from '@/crunchyroll/CrunchyrollService';
import { Utils } from '@common/Utils';

export interface CrunchyrollSession extends ServiceApiSession {
	tokenExpirationDate: Date;
	accountId: string;
}

export interface CrunchyrollTokenData {
	access_token: string;
	account_id: string;
	expires_in: number;
}

export interface CrunchyrollProfileData {
	username: string;
}

export interface CrunchyrollHistoryPage {
	items: CrunchyrollHistoryItem[];
	next_page?: string;
}

export interface CrunchyrollHistoryItem {
	id: string;
	date_played: Date;
	fully_watched: boolean;
	playhead: number;
	parent_id: string;
	panel: {
		title: string;
		episode_metadata: {
			series_id: string;
			season_number: number;
			season_id: string;
			episode: string;
			episode_number?: number;
			episode_air_date: Date;
			series_title: string;
			duration_ms: number;
		};
	};
}

class _CrunchyrollApi extends ServiceApi {
	HOST_URL: string;
	TOKEN_URL: string;
	PROFILE_URL: string;
	TOKEN_AUTH: string;
	isActivated: boolean;
	session: CrunchyrollSession | null = null;

	authRequests = Requests;

	constructor() {
		super(CrunchyrollService.id);

		this.HOST_URL = 'https://www.crunchyroll.com';
		this.TOKEN_URL = `${this.HOST_URL}/auth/v1/token`;
		this.PROFILE_URL = `${this.HOST_URL}/accounts/v1/me/profile`;
		// The basic auth password for retrieving the token is always the same.
		this.TOKEN_AUTH = 'bm9haWhkZXZtXzZpeWcwYThsMHE6';

		this.isActivated = false;
	}

	async activate() {
		let response = await Requests.send({
			url: `${this.TOKEN_URL}?_=${Date.now()}`,
			method: 'POST',
			headers: {
				Authorization: `Basic ${this.TOKEN_AUTH}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: 'grant_type=etp_rt_cookie',
		});
		const tokenData = JSON.parse(response) as CrunchyrollTokenData;
		this.authRequests = withHeaders({
			Authorization: `Bearer ${tokenData.access_token}`,
		});

		response = await this.authRequests.send({
			url: this.PROFILE_URL,
			method: 'GET',
		});
		const profileData = JSON.parse(response) as CrunchyrollProfileData;

		// The token expires within a few minutes, so we need to be able to check for that.
		const expirationDate = new Date();
		expirationDate.setSeconds(expirationDate.getSeconds() + tokenData.expires_in - 5);

		this.session = {
			profileName: profileData.username,
			tokenExpirationDate: expirationDate,
			accountId: tokenData.account_id,
		};
		this.isActivated = true;
	}

	async checkLogin() {
		if (!this.isActivated || (!!this.session && new Date() < this.session.tokenExpirationDate)) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(): Promise<CrunchyrollHistoryItem[]> {
		// We do this here because the token will expire within minutes.
		await this.checkLogin();

		if (!this.nextHistoryUrl && this.session?.accountId) {
			this.nextHistoryUrl = `${this.HOST_URL}/content/v1/watch-history/${this.session.accountId}?locale=en-US&page=1&page_size=10`;
		}

		// Retrieve the history items
		const responseText = await this.authRequests.send({
			url: this.nextHistoryUrl,
			method: 'GET',
		});
		const page = this.parseJsonWithDates<CrunchyrollHistoryPage>(responseText, [
			'date_played',
			'episode_air_date',
		]);

		let historyItems: CrunchyrollHistoryItem[] = [];
		// Filter out entries with missing information.
		if (page) {
			historyItems = page.items.filter((item) => !!item?.panel?.episode_metadata);
		}

		if (page?.next_page) {
			this.nextHistoryUrl = this.HOST_URL + page.next_page;
		} else {
			this.hasReachedHistoryEnd = true;
		}

		return historyItems;
	}

	isNewHistoryItem(historyItem: CrunchyrollHistoryItem, lastSync: number) {
		return Utils.unix(historyItem.date_played) > lastSync;
	}

	getHistoryItemId(historyItem: CrunchyrollHistoryItem): string {
		return historyItem.id;
	}

	convertHistoryItems(historyItems: CrunchyrollHistoryItem[]): Promise<ScrobbleItem[]> {
		const items: ScrobbleItem[] = [];
		for (const historyItem of historyItems) {
			const item = new EpisodeItem({
				id: historyItem.id,
				serviceId: this.id,
				title: historyItem.panel.title,
				// Although we have episode and season info, we omit these,
				// because the numbers used by Crunchyroll often don't correspond with the Trakt ones.
				// We are more likely to find a match just using the series name and title.
				number: 0,
				season: 0,
				year: new Date(historyItem.panel.episode_metadata.episode_air_date).getUTCFullYear(),
				watchedAt: Utils.unix(historyItem.date_played),
				progress: historyItem.fully_watched
					? 100
					: (historyItem.playhead / (historyItem.panel.episode_metadata.duration_ms / 1000)) * 100,
				show: {
					id: historyItem.panel.episode_metadata.series_id,
					serviceId: this.id,
					title: historyItem.panel.episode_metadata.series_title,
				},
			});

			items.push(item);
		}

		return Promise.resolve(items);
	}

	parseJsonWithDates<T>(text: string, dateFieldNames: string[]): T {
		const dateReviver = (key: string, value: unknown) => {
			return dateFieldNames.includes(key) &&
				(typeof value === 'string' || typeof value === 'number')
				? new Date(value)
				: value;
		};
		return JSON.parse(text, dateReviver) as T;
	}
}

export const CrunchyrollApi = new _CrunchyrollApi();
