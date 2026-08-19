import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests, withHeaders } from '@common/Requests';
import { EpisodeItem, MovieItem, ScrobbleItem } from '@models/Item';
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
	parent_type?: string;
	panel: {
		title: string;
		episode_metadata: CrunchyrollEpisodeMetadata;
		images?: {
			thumbnail?: CrunchyrollThumbnail[][];
		};
	};
}

export interface CrunchyrollEpisodeMetadata {
	series_id: string;
	season_number: number;
	season_id: string;
	episode: string;
	episode_number?: number;
	sequence_number?: number;
	episode_air_date: Date;
	season_title: string;
	season_slug_title?: string;
	series_title: string;
	series_slug_title?: string;
	duration_ms: number;
}

export interface CrunchyrollThumbnail {
	height: number;
	source: string;
	type: string;
	width: number;
}

class _CrunchyrollApi extends ServiceApi {
	HOST_URL: string;
	TOKEN_URL: string;
	PROFILE_URL: string;
	TOKEN_AUTH: string;
	DEVICE_ID: string;
	DEVICE_NAME: string;
	isActivated: boolean;
	session: CrunchyrollSession | null = null;

	movieRegex: RegExp = /(?:^|-)movies?|mov(?:-|$)/i;
	dubSubSuffix: RegExp = / \((?:\w+ )?(?:Dub|Dubbed|Sub|Subbed|Subtitled)\)/;

	authRequests = Requests;

	constructor() {
		super(CrunchyrollService.id);

		this.HOST_URL = 'https://www.crunchyroll.com';
		this.TOKEN_URL = `${this.HOST_URL}/auth/v1/token`;
		this.PROFILE_URL = `${this.HOST_URL}/accounts/v1/me/profile`;
		// The basic auth password for retrieving the token is always the same.
		this.TOKEN_AUTH = 'bm9haWhkZXZtXzZpeWcwYThsMHE6';

		this.DEVICE_ID = '1a740c71-27ac-409a-a360-549a3dadacc6'; // randomly generated to follow UUID v4 standard
		this.DEVICE_NAME = 'Universal Trakt Scrobbler'; // this will be shown in Crunchyrolls new device login notification mail

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
			body: `device_id=${this.DEVICE_ID}&device_type=${encodeURIComponent(
				this.DEVICE_NAME
			)}&grant_type=etp_rt_cookie`,
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

	async loadHistoryItems(cancelKey = 'default'): Promise<CrunchyrollHistoryItem[]> {
		// We do this here because the token will expire within minutes.
		await this.checkLogin();

		if (!this.nextHistoryUrl && this.session?.accountId) {
			this.nextHistoryUrl = `${this.HOST_URL}/content/v1/watch-history/${this.session.accountId}?locale=en-US&page=1&page_size=20`;
		}

		// Retrieve the history items
		const responseText = await this.authRequests.send({
			url: this.nextHistoryUrl,
			method: 'GET',
			cancelKey,
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

	updateItemFromHistory(item: ScrobbleItem): Promise<void> {
		// Nothing to update, as Crunchyroll provides all the info in the history endpoint.
		return Promise.resolve();
	}

	convertHistoryItems(historyItems: CrunchyrollHistoryItem[]): Promise<ScrobbleItem[]> {
		const items: ScrobbleItem[] = [];

		for (const historyItem of historyItems) {
			const metadata = historyItem.panel.episode_metadata;
			const title = this.getNormalizedTitle(historyItem);
			const thumbnail = historyItem.panel.images?.thumbnail
				?.find((o) => o.length > 0)
				?.find((t) => !!t.source);

			if (this.isMovie(historyItem)) {
				const item = new MovieItem({
					id: historyItem.id,
					serviceId: this.id,
					title: title,
					imageUrl: thumbnail?.source,
					year: new Date(metadata.episode_air_date).getUTCFullYear(),
					watchedAt: Utils.unix(historyItem.date_played),
					progress: historyItem.fully_watched
						? 100
						: (historyItem.playhead / metadata.duration_ms) * 100,
				});
				items.push(item);
			} else {
				const item = new EpisodeItem({
					id: historyItem.id,
					serviceId: this.id,
					title: title,
					imageUrl: thumbnail?.source,
					number: metadata.episode_number || 0,
					// season numbering is often not aligned with official seasons
					// check against slug to receive more aligned season number
					season: this.getBestSeasonNumber(metadata),
					// Crunchyroll often numbers anime episodes sequentially across all seasons,
					// so allow episode matching to resolve the number as absolute.
					isAbsolute: true,
					year: new Date(metadata.episode_air_date).getUTCFullYear(),
					watchedAt: Utils.unix(historyItem.date_played),
					progress: historyItem.fully_watched
						? 100
						: (historyItem.playhead / metadata.duration_ms) * 100,
					show: {
						id: metadata.series_id,
						serviceId: this.id,
						title: metadata.series_title,
					},
				});
				items.push(item);
			}
		}

		return Promise.resolve(items);
	}

	getBestSeasonNumber(metadata: CrunchyrollEpisodeMetadata): number {
		const slug = metadata.season_slug_title;
		if (!slug) {
			return metadata.season_number || 0;
		}
		if (/(?:^|-)ovas?(?:-|$)/i.test(slug)) {
			return 0;
		}
		const matches = /season-(?<season>\d+)/i.exec(slug);
		if (!matches?.groups) {
			return metadata.season_number || 0;
		}
		const { season } = matches.groups;
		return Number.parseInt(season, 10);
	}

	isMovie(historyItem: CrunchyrollHistoryItem): boolean {
		const metadata = historyItem.panel.episode_metadata;
		return (
			(!!metadata.season_title && metadata.season_title.toLowerCase().includes('movie')) ||
			historyItem.panel.title.toLowerCase() === 'movie' ||
			metadata.episode_number === null ||
			this.movieRegex.test(metadata.series_slug_title ?? '') ||
			this.movieRegex.test(metadata.season_slug_title ?? '')
		);
	}

	getNormalizedTitle(historyItem: CrunchyrollHistoryItem) {
		const title = historyItem.panel.title.replace(this.dubSubSuffix, '');
		const metadata = historyItem.panel.episode_metadata;
		if (title.toLowerCase() === 'episode') {
			return `${title} ${metadata.episode || metadata.sequence_number}`;
		}
		if (title.toLowerCase() === 'movie' || title.trim().length === 0) {
			return (
				metadata.season_title.replace(this.dubSubSuffix, '') ||
				metadata.series_title.replace(this.dubSubSuffix, '')
			);
		}
		return title;
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
