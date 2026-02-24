import { ServiceApi } from '@apis/ServiceApi';
import { KinoPubAuthDetails } from '@common/BrowserStorage';
import { Requests, withHeaders } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';
import { Utils } from '@common/Utils';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { KinoPubService } from '@/kino-pub/KinoPubService';

export interface KinoPubHistoryItem {
	mediaId: string;
	itemId: string;
	type: 'movie' | 'episode';
	title: string;
	year?: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	showTitle?: string;
	watchedAt: number;
}

interface KinoPubHistoryResponse {
	history: KinoPubHistoryEntry[];
	pagination: {
		total: number;
		current: number;
		perpage: number;
		total_items: number;
	};
}

interface KinoPubHistoryEntry {
	time: number;
	counter: number;
	first_seen: number;
	last_seen: number;
	item: KinoPubItemResponse;
	media: KinoPubMediaResponse;
}

interface KinoPubItemResponse {
	id: number;
	title: string;
	type: string;
	subtype: string;
	year: number;
	imdb: number;
	imdb_rating: number;
	kinopoisk: number;
	kinopoisk_rating: number;
	posters: { small: string; medium: string; big: string };
}

interface KinoPubMediaResponse {
	id: number;
	number: number;
	snumber: number;
	title: string;
}

interface KinoPubDeviceCodeResponse {
	code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

interface KinoPubTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
}

const SERIAL_TYPES = ['serial', 'docuserial', 'tvshow'];

class _KinoPubApi extends ServiceApi {
	API_URL = 'https://api.service-kp.com';
	private authRequests = Requests;
	private isActivated = false;

	constructor() {
		super(KinoPubService.id);
	}

	override reset(): void {
		super.reset();
		this.isActivated = false;
	}

	async checkLogin(): Promise<boolean> {
		try {
			const valid = await this.ensureValidToken();
			if (!valid) {
				return await this.startDeviceFlow();
			}
			return true;
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log(`Failed to check login for ${this.id}`, err);
			}
			return false;
		}
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<KinoPubHistoryItem[]> {
		const loggedIn = await this.checkLogin();
		if (!loggedIn) {
			this.hasReachedHistoryEnd = true;
			return [];
		}

		const page = this.nextHistoryPage + 1;
		const responseText = await this.authRequests.send({
			url: `${this.API_URL}/v1/history?page=${page}&perpage=50`,
			method: 'GET',
			cancelKey,
		});

		const response = JSON.parse(responseText) as KinoPubHistoryResponse;
		const { history, pagination } = response;

		if (pagination.current >= pagination.total) {
			this.hasReachedHistoryEnd = true;
		} else {
			this.nextHistoryPage = pagination.current;
		}

		return history.map((entry) => this.mapHistoryEntry(entry));
	}

	isNewHistoryItem(
		historyItem: KinoPubHistoryItem,
		lastSync: number,
		_lastSyncId: string
	): boolean {
		return historyItem.watchedAt > lastSync;
	}

	getHistoryItemId(historyItem: KinoPubHistoryItem): string {
		return historyItem.mediaId;
	}

	convertHistoryItems(historyItems: KinoPubHistoryItem[]): ScrobbleItem[] {
		return historyItems.map((historyItem) => {
			if (historyItem.type === 'episode') {
				return new EpisodeItem({
					serviceId: this.id,
					id: `${historyItem.itemId}_s${historyItem.season}e${historyItem.episode}`,
					title: historyItem.episodeTitle ?? '',
					season: historyItem.season ?? 0,
					number: historyItem.episode ?? 0,
					watchedAt: historyItem.watchedAt,
					progress: 100,
					show: {
						serviceId: this.id,
						title: historyItem.showTitle ?? historyItem.title,
					},
				});
			}
			return new MovieItem({
				serviceId: this.id,
				id: historyItem.itemId,
				title: historyItem.title,
				year: historyItem.year,
				watchedAt: historyItem.watchedAt,
				progress: 100,
			});
		});
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: KinoPubHistoryItem): void {
		item.watchedAt = historyItem.watchedAt;
		item.progress = 100;
	}

	private async ensureValidToken(): Promise<boolean> {
		if (this.isActivated) {
			const { kinoPubAuth } = await Shared.storage.get('kinoPubAuth');
			if (kinoPubAuth && !this.hasTokenExpired(kinoPubAuth)) {
				return true;
			}
		}

		const { kinoPubAuth } = await Shared.storage.get('kinoPubAuth');
		if (!kinoPubAuth) {
			return false;
		}

		if (!this.hasTokenExpired(kinoPubAuth)) {
			this.setAuthRequests(kinoPubAuth.access_token);
			await this.notifyDevice();
			return true;
		}

		return this.refreshToken(kinoPubAuth.refresh_token);
	}

	private hasTokenExpired(auth: KinoPubAuthDetails): boolean {
		const now = Utils.unix();
		return auth.created_at + auth.expires_in < now;
	}

	private async refreshToken(refreshToken: string): Promise<boolean> {
		try {
			const responseText = await Requests.send({
				url: `${this.API_URL}/oauth2/token?grant_type=refresh_token&client_id=${Shared.kinoPubClientId}&client_secret=${Shared.kinoPubClientSecret}&refresh_token=${refreshToken}`,
				method: 'POST',
			});
			const tokenData = JSON.parse(responseText) as KinoPubTokenResponse;
			await this.saveToken(tokenData);
			return true;
		} catch {
			await Shared.storage.remove('kinoPubAuth');
			this.isActivated = false;
			return false;
		}
	}

	private async startDeviceFlow(): Promise<boolean> {
		try {
			const codeResponseText = await Requests.send({
				url: `${this.API_URL}/oauth2/device?grant_type=device_code&client_id=${Shared.kinoPubClientId}&client_secret=${Shared.kinoPubClientSecret}`,
				method: 'POST',
			});
			const codeData = JSON.parse(codeResponseText) as KinoPubDeviceCodeResponse;

			await Tabs.open(codeData.verification_uri);

			if (typeof window !== 'undefined') {
				console.log(
					`Enter this code on the Kino.pub device page:\n${codeData.verification_uri}`,
					codeData.user_code
				);
				window.prompt(
					`Enter this code on the Kino.pub device page:\n${codeData.verification_uri}`,
					codeData.user_code
				);
			}

			const tokenData = await this.pollForToken(
				codeData.code,
				codeData.interval,
				Date.now() + codeData.expires_in * 1000
			);

			await this.saveToken(tokenData);
			await this.notifyDevice();
			return true;
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log('Kino.pub device flow failed', err);
			}
			return false;
		}
	}

	private pollForToken(
		code: string,
		interval: number,
		expiresAt: number
	): Promise<KinoPubTokenResponse> {
		return new Promise((resolve, reject) => {
			const poll = async () => {
				if (Date.now() > expiresAt) {
					reject(new Error('Device code expired'));
					return;
				}
				try {
					const responseText = await Requests.send({
						url: `${this.API_URL}/oauth2/device?grant_type=device_token&client_id=${Shared.kinoPubClientId}&client_secret=${Shared.kinoPubClientSecret}&code=${code}`,
						method: 'POST',
					});
					resolve(JSON.parse(responseText) as KinoPubTokenResponse);
				} catch {
					setTimeout(() => void poll(), interval * 1000);
				}
			};
			void poll();
		});
	}

	private async saveToken(tokenData: KinoPubTokenResponse): Promise<void> {
		const kinoPubAuth: KinoPubAuthDetails = {
			access_token: tokenData.access_token,
			token_type: tokenData.token_type,
			expires_in: tokenData.expires_in,
			refresh_token: tokenData.refresh_token,
			created_at: Utils.unix(),
		};
		await Shared.storage.set({ kinoPubAuth }, true);
		this.setAuthRequests(kinoPubAuth.access_token);
	}

	private setAuthRequests(accessToken: string): void {
		this.authRequests = withHeaders({
			Authorization: `Bearer ${accessToken}`,
		});
		this.isActivated = true;
	}

	private async notifyDevice(): Promise<void> {
		try {
			await this.authRequests.send({
				url: `${this.API_URL}/v1/device/notify`,
				method: 'POST',
				body: {
					title: 'Universal Trakt Scrobbler',
					hardware: 'Browser Extension',
					software: 'Universal Trakt Scrobbler',
				},
			});
		} catch {
			// Device notification is best-effort, don't fail the flow
		}
	}

	private mapHistoryEntry(entry: KinoPubHistoryEntry): KinoPubHistoryItem {
		const { item, media } = entry;

		if (SERIAL_TYPES.includes(item.type)) {
			return {
				mediaId: String(media.id),
				itemId: String(item.id),
				type: 'episode',
				title: item.title,
				year: item.year,
				season: media.snumber,
				episode: media.number,
				episodeTitle: media.title,
				showTitle: item.title,
				watchedAt: entry.last_seen,
			};
		}

		return {
			mediaId: String(media.id),
			itemId: String(item.id),
			type: 'movie',
			title: item.title,
			year: item.year,
			watchedAt: entry.last_seen,
		};
	}
}

export const KinoPubApi = new _KinoPubApi();
