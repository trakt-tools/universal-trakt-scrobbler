import { Requests } from '@common/Requests';
import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { MovieItem, EpisodeItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { BbciplayerService } from '@/bbciplayer/BbciplayerService';
import { Utils } from '@common/Utils';

export interface BBCProfileData {
	profileAdmin: {
		credential: string;
		displayName: string;
		email: string;
		username: string;
	};
	permissions: {
		create: boolean;
		switch: boolean;
	};
	profiles: any[];
}

export interface BBCSession extends ServiceApiSession {
	profileName: string;
	email: string;
	username: string;
}

export interface BBCHistoryItem {
	id: string;
	title: string;
	showTitle: string;
	season?: number;
	episode?: number;
	progress?: number;
	completed?: boolean;
	watchedAt?: number;
}

interface BBCPlay {
	id: string;
	action: string; // e.g., 'ended'
	offset?: number;
	timestamp?: string | number;
}

interface BBCEpisodeDetails {
	id: string;
	title?: string;
	original_title?: string;
	brand_title?: string;
	slice_id?: string;
	parent_position?: number;
	episode_number?: number;
	versions?: { duration?: { value?: string }; first_broadcast_date_time?: string }[];
	release_date_time?: string; // keep this
	release_date?: string; // optional, some endpoints may include this
	labels?: { category?: string };
	categories?: string[];
}

class _BbciplayerApi extends ServiceApi {
	public session: BBCSession | null = null;
	public hasReachedHistoryEnd = false;
	public isActivated = false;

	private BASE_URL = 'https://session.bbc.co.uk';
	private PROFILE_URL = `${this.BASE_URL}/session/profiles`;

	constructor() {
		super(BbciplayerService.id);
	}

	async activate(): Promise<void> {
		try {
			const responseText = await Requests.send({ url: this.PROFILE_URL, method: 'GET' });
			const data = JSON.parse(responseText) as BBCProfileData;

			if (data?.profileAdmin?.displayName) {
				this.session = {
					profileName: data.profileAdmin.displayName,
					email: data.profileAdmin.email,
					username: data.profileAdmin.username,
				};
				this.isActivated = true;
			} else {
				this.session = null;
				this.isActivated = false;
			}
		} catch (err) {
			console.warn('[BBC] Failed to activate session', err);
			this.session = null;
			this.isActivated = false;
		}
	}

	async checkLogin(): Promise<boolean> {
		if (!this.isActivated) await this.activate();
		return !!this.session?.profileName;
	}

	/** Fetch viewing history using /user/plays */
	async loadHistoryItems(): Promise<BBCHistoryItem[]> {
		await this.checkLogin();
		if (!this.session) throw new Error('Not logged in to BBC iPlayer');

		const history: BBCHistoryItem[] = [];
		let nextUrl: string | null = 'https://user.ibl.api.bbc.co.uk/ibl/v1/user/plays';
		this.hasReachedHistoryEnd = false;

		try {
			// single attempt only
			const playsResp = await Requests.send({ url: nextUrl, method: 'GET' });
			const playsData = JSON.parse(playsResp) as { plays: BBCPlay[] };
			const plays = playsData.plays ?? [];
			console.log(`[BBC] Found ${plays.length} play entries from ${nextUrl}`);

			for (const play of plays) {
				try {
					const [playDetails, epDetails] = await Promise.all([
						this.fetchPlayDetails(play.id),
						this.fetchEpisodeDetails(play.id),
					]);

					if (!epDetails) continue; // epDetails is BBCEpisodeDetails

					const showTitle = epDetails.brand_title ?? epDetails.title ?? 'Unknown';
					const episodeTitle = epDetails.original_title ?? epDetails.title ?? 'Unknown';
					const season = parseInt(epDetails.slice_id?.match(/structural-(\d+)-/)?.[1] ?? '1', 10);
					const episodeNum = epDetails.parent_position ?? 1;
					const completed = play.action === 'ended';
					const rawTimestamp =
						playDetails?.timestamp ??
						epDetails?.versions?.[0]?.first_broadcast_date_time ??
						epDetails?.release_date_time ??
						undefined;

					const watchedAt = rawTimestamp ? Utils.unix(rawTimestamp) : undefined;
					const duration = this.parseDuration(epDetails.versions?.[0]?.duration?.value);
					const progress = completed
						? 100
						: play.offset !== undefined
							? Math.min(Math.floor((play.offset / Math.max(duration, 1)) * 100), 99)
							: 0; // fallback if offset is undefined

					history.push({
						id: play.id,
						title: episodeTitle,
						showTitle,
						season,
						episode: episodeNum,
						progress,
						completed,
						watchedAt,
					});
				} catch (err) {
					console.warn('[BBC] Failed processing play', play.id, err);
				}
			}

			this.hasReachedHistoryEnd = true;
			history.sort((a, b) => (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
			console.log(`[BBC] Total watched episodes: ${history.length}`);
			return history;
		} catch (err) {
			console.warn('[BBC] Failed to load history on first attempt', err);
			// stop processing entirely
			this.hasReachedHistoryEnd = true;
			return [];
		}
	}

	private async fetchPlayDetails(id: string): Promise<BBCPlay> {
		const res = await Requests.send({
			url: `https://user.ibl.api.bbc.co.uk/ibl/v1/user/plays/${id}`,
			method: 'GET',
		});
		return JSON.parse(res) as BBCPlay;
	}

	private async fetchEpisodeDetails(id: string): Promise<BBCEpisodeDetails | null> {
		const res = await Requests.send({
			url: `https://ibl.api.bbci.co.uk/ibl/v1/episodes/${id}`,
			method: 'GET',
		});
		const ep = JSON.parse(res)?.episodes?.[0];
		return ep ?? null;
	}

	private parseDuration(isoDuration: string | undefined): number {
		if (!isoDuration) return 0;
		const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
		if (!match) return 0;
		const hours = parseInt(match[1] ?? '0', 10);
		const minutes = parseInt(match[2] ?? '0', 10);
		const seconds = parseFloat(match[3] ?? '0');
		return hours * 3600 + minutes * 60 + seconds;
	}

	/** Convert ISO timestamp string or number to UNIX seconds */
	private toUnix(rawTimestamp?: string | number): number {
		if (!rawTimestamp) return Math.floor(Date.now() / 1000);
		if (typeof rawTimestamp === 'number') return rawTimestamp; // already UNIX seconds
		return Math.floor(new Date(rawTimestamp).getTime() / 1000);
	}

	/** Convert history items to ScrobbleItems for Trakt */
	async convertHistoryItems(historyItems: BBCHistoryItem[]): Promise<ScrobbleItem[]> {
		return Promise.all(
			historyItems.map(async (ep) => {
				const epDetails = await this.fetchEpisodeDetails(ep.id);
				if (!epDetails) return null;

				const isFilm =
					epDetails.labels?.category?.startsWith('Film') || epDetails.categories?.includes('films');

				if (isFilm) {
					const releaseDateTime = epDetails.release_date_time ?? epDetails.release_date;
					const year = releaseDateTime ? new Date(releaseDateTime).getUTCFullYear() : undefined;

					return new MovieItem({
						serviceId: this.id,
						id: ep.id,
						title: ep.title ?? epDetails.original_title ?? 'Unknown film',
						year: year ?? new Date().getUTCFullYear(),
						watchedAt: this.toUnix(ep.watchedAt),
						progress: ep.completed ? 100 : (ep.progress ?? 0),
					});
				}

				// Normal episode
				const year = new Date(this.toUnix(ep.watchedAt) * 1000).getUTCFullYear();

				return new EpisodeItem({
					serviceId: this.id,
					id: ep.id,
					title: ep.title,
					season: ep.season ?? 0,
					number: ep.episode ?? 0,
					year,
					watchedAt: this.toUnix(ep.watchedAt),
					progress: ep.completed ? 100 : (ep.progress ?? 0),
					show: { serviceId: this.id, id: ep.showTitle, title: ep.showTitle },
				});
			})
		).then((items) => items.filter(Boolean) as ScrobbleItem[]);
	}

	/** Update existing ScrobbleItem with history data */
	updateItemFromHistory(item: ScrobbleItemValues, historyItem: BBCHistoryItem): void {
		item.progress = historyItem.completed ? 100 : (historyItem.progress ?? 0);
		if (historyItem.watchedAt !== undefined) {
			item.watchedAt = this.toUnix(historyItem.watchedAt);
		}
	}

	/** Determine if a history item is new compared to last sync */
	isNewHistoryItem(historyItem: BBCHistoryItem, lastSync: number): boolean {
		return this.toUnix(historyItem.watchedAt) > lastSync;
	}

	/** Get unique history item ID */
	getHistoryItemId(historyItem: BBCHistoryItem): string {
		return historyItem.id;
	}

	async getItem(id: string): Promise<ScrobbleItem | null> {
		if (!this.isActivated) await this.activate();
		if (!this.session) throw new Error('Invalid session');

		try {
			const responseText = await Requests.send({
				url: `https://ibl.api.bbci.co.uk/ibl/v1/episodes/${id}`,
				method: 'GET',
			});
			const data = JSON.parse(responseText)?.episodes?.[0];
			if (!data) return null;

			const isFilm =
				data.labels?.category?.startsWith('Film') || data.categories?.includes('films');

			if (isFilm) {
				// Use release_date_time for MovieItem year
				const releaseDateTime = data.release_date_time ?? data.release_date;
				const year = releaseDateTime ? new Date(releaseDateTime).getUTCFullYear() : undefined;

				return new MovieItem({
					serviceId: this.id,
					id: data.id,
					title: data.title ?? data.original_title ?? 'Unknown film',
					year: year ?? new Date().getUTCFullYear(),
					watchedAt: year ? this.toUnix(releaseDateTime) : undefined,
					progress: 100, // BBC doesn’t report partial film progress yet
				});
			}

			// Regular series episode
			const season = data.parent_position ?? 0;
			const number = data.episode_number ?? 0;

			return new EpisodeItem({
				serviceId: this.id,
				id: data.id,
				title: data.title,
				season,
				number,
				watchedAt: this.toUnix(data.watchedAt),
				progress: data.watchedAt,
				show: {
					serviceId: this.id,
					title: data.brand_title ?? data.title,
				},
			});
			console.log('[BBC] Fetched item:', id, data);
		} catch (err) {
			console.error('[BBC] Failed to fetch item:', err);
			return null;
		}
	}
}

export const BbciplayerApi = new _BbciplayerApi();
