import { ServiceApi, ServiceApiSession } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { EpisodeItem, MovieItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { AdnService } from '@/adn/AdnService';
import { ScriptInjector } from '@common/ScriptInjector';
import { Utils } from '@common/Utils';
import { Shared } from '@common/Shared';

import browser from 'webextension-polyfill';

export interface AdnSession extends ServiceApiSession {
	auth: {
		accessToken: string;
		refreshToken: string;
	};
	profileId: number | null;
}

export interface AdnTokenData {
	accessToken: string;
	refreshToken: string;
}

export interface AdnHistoryPage {
	videos: AdnHistoryItem[];
}

export interface AdnHistoryItem {
	id: number;
	duration: number;
	number: string;
	shortNumber: string;
	season: string;
	releaseDate: string;
	type: string;
	image: string;
	show: {
		id: number;
		title: string;
		originalTitle: string;
		firstReleaseYear: string;
	};
	name: string;
	title: string;
	user: {
		id: number;
		isFullyWatched: boolean;
		stoptime: number;
		watchDate: string;
	};
}

class _AdnApi extends ServiceApi {
	HOST_URL: string;
	API_URL: string;
	REFRESH_URL: string;
	PROFILE_URL: string;
	HISTORY_URL: string;

	isActivated: boolean;
	session: AdnSession | null = null;

	pageSize: number = 25;
	lang: string;

	request = Requests;

	constructor() {
		super(AdnService.id);

		this.HOST_URL = `${AdnService.homePage}/de/account/history`;
		this.API_URL = 'https://gw.api.animationdigitalnetwork.com';
		this.REFRESH_URL = `${this.API_URL}/authentication/refresh`;
		this.PROFILE_URL = `${this.API_URL}/user/public/profile`;
		this.HISTORY_URL = `${this.API_URL}/viewing/history?limit=${this.pageSize}`;

		this.lang = browser.i18n.getUILanguage();

		this.isActivated = false;
	}

	async activate() {
		try {
			const partialSession = await this.getSession();
			if (
				!partialSession ||
				!partialSession.auth ||
				!partialSession.auth.accessToken ||
				!partialSession.auth.refreshToken
			) {
				throw new Error();
			}

			const verifyTokenResponse = await Requests.send({
				url: `${this.PROFILE_URL}`,
				method: 'GET',
				headers: {
					Authorization: `Bearer ${partialSession.auth.accessToken}`,
					'x-profile-id': `${partialSession.profileId}`,
					'x-source': 'Web',
					'x-target-distribution': `${this.lang}`,
				},
			});

			if (verifyTokenResponse === '{"message":"Unauthorized"}') {
				let response = await Requests.send({
					url: `${this.REFRESH_URL}`,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-access-token': partialSession.auth.accessToken,
						'x-profile-id': `${partialSession.profileId}`,
						'x-source': 'Web',
						'x-target-distribution': `${this.lang}`,
					},
					body: `{"refreshToken":"${partialSession.auth.refreshToken}"}`,
				});

				const tokenData = JSON.parse(response) as AdnTokenData;

				this.session = {
					auth: {
						accessToken: tokenData.accessToken,
						refreshToken: tokenData.refreshToken,
					},
					profileName: partialSession.profileName ?? null,
					profileId: partialSession.profileId ?? null,
				};
			} else {
				this.session = {
					auth: {
						accessToken: partialSession.auth.accessToken,
						refreshToken: partialSession.auth.refreshToken,
					},
					profileName: partialSession.profileName ?? null,
					profileId: partialSession.profileId ?? null,
				};
			}

			this.isActivated = true;
		} catch (_err) {}
	}

	async checkLogin() {
		if (!this.isActivated || !!this.session) {
			await this.activate();
		}
		return !!this.session && this.session.profileName !== null;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<AdnHistoryItem[]> {
		let historyItems: AdnHistoryItem[] = [];

		if (
			!this.session ||
			!this.session.auth ||
			!this.session.auth.accessToken ||
			!this.session.auth.refreshToken
		) {
			throw new Error();
		}

		if (!this.nextHistoryUrl) {
			this.nextHistoryUrl = `${this.HISTORY_URL}`;
			this.nextHistoryPage = 0;
		}

		const responseText = await this.request.send({
			url: this.nextHistoryUrl,
			headers: {
				Authorization: `Bearer ${this.session.auth.accessToken}`,
				'x-target-distribution': `${this.lang}`,
				'x-profile-id': `${this.session.profileId}`,
			},
			method: 'GET',
			cancelKey,
		});

		const responseJson = JSON.parse(responseText);

		historyItems = responseJson?.videos ?? [];

		this.hasReachedHistoryEnd = historyItems.length < this.pageSize;
		this.nextHistoryPage += this.pageSize;

		if (!this.hasReachedHistoryEnd) {
			this.nextHistoryUrl = `${this.HISTORY_URL}&offset=${this.nextHistoryPage}`;
		}

		return historyItems;
	}

	isNewHistoryItem(historyItem: AdnHistoryItem, lastSync: number, _lastSyncId: string) {
		return Utils.unix(historyItem.user.watchDate) > lastSync;
	}

	getHistoryItemId(historyItem: AdnHistoryItem): string {
		return historyItem.id.toString();
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: AdnHistoryItem): void {
		item.watchedAt = Utils.unix(historyItem.user.watchDate);
		item.progress = 100;
	}

	convertHistoryItems(historyItems: AdnHistoryItem[]) {
		const items: ScrobbleItem[] = [];

		for (const historyItem of historyItems) {
			if (this.isMovie(historyItem)) {
				const item = new MovieItem({
					id: historyItem.id.toString(),
					serviceId: this.id,
					title: historyItem.show.title,
					imageUrl: historyItem.image,
					year: Number.parseInt(historyItem.show.firstReleaseYear),
					watchedAt: Utils.unix(historyItem.user.watchDate),
					progress: 100,
				});
				items.push(item);
			} else {
				const item = new EpisodeItem({
					id: historyItem.id.toString(),
					serviceId: this.id,
					title: historyItem.name,
					number: Number.parseInt(historyItem.shortNumber) || 0,
					season: Number.parseInt(historyItem.season) || 0,
					imageUrl: historyItem.image,
					year: Number.parseInt(historyItem.show.firstReleaseYear),
					watchedAt: Utils.unix(historyItem.user.watchDate),
					progress: 100,
					show: {
						id: historyItem.show.id.toString(),
						serviceId: this.id,
						title: historyItem.show.title,
					},
				});
				items.push(item);
			}
		}

		return Promise.resolve(items);
	}

	isMovie(historyItem: AdnHistoryItem) {
		return historyItem.type === 'MOV';
	}

	async getSession(): Promise<Partial<AdnSession> | null> {
		const result = await ScriptInjector.inject<Partial<AdnSession>>(
			this.id,
			'session',
			this.HOST_URL
		);
		return result;
	}
}

Shared.functionsToInject[`${AdnService.id}-session`] = () => {
	const session: Partial<AdnSession> = {};

	const accessToken = window.localStorage.getItem('token') ?? '';
	const refreshToken = window.localStorage.getItem('refresh_token') ?? '';
	const profile = JSON.parse(window.localStorage.getItem('profile') ?? '{}');
	session.auth = {
		accessToken,
		refreshToken,
	};
	session.profileName = profile?.name ?? null;
	session.profileId = profile?.id ?? null;

	return session;
};

export const AdnApi = new _AdnApi();
