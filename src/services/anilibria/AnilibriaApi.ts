import { ServiceApi } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { EpisodeItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { AnilibriaService } from '@/anilibria/AnilibriaService';
import browser from 'webextension-polyfill';

interface AnilibriaProfileResponse {
	nickname?: string;
	login?: string;
	email?: string;
}

interface AnilibriaName {
	main?: string | null;
	english?: string | null;
	alternative?: string | null;
}

interface AnilibriaRelease {
	id: number;
	year?: number | null;
	name?: AnilibriaName | null;
	alias?: string | null;
	poster?: {
		thumbnail?: string | null;
		preview?: string | null;
		optimized?: {
			thumbnail?: string | null;
			preview?: string | null;
		} | null;
	} | null;
}

export interface AnilibriaEpisodeResponse {
	id: string;
	name?: string | null;
	name_english?: string | null;
	ordinal?: number | null;
	duration?: number | null;
	updated_at?: string | null;
	release_id: number;
	release?: AnilibriaRelease | null;
}

interface AnilibriaRawTimecode extends Array<string | number | boolean | null> {
	0: string;
	1: number;
	2: boolean;
}

export interface AnilibriaHistoryItem {
	releaseEpisodeId: string;
	time: number;
	isWatched: boolean;
	firstImportedAt: number;
}

const HOST_URL = 'https://anilibria.top';

const getBestTitle = (release?: AnilibriaRelease | null): string =>
	release?.name?.english || release?.name?.main || release?.name?.alternative || '';

const getImageUrl = (release?: AnilibriaRelease | null): string | undefined => {
	const path =
		release?.poster?.optimized?.thumbnail ||
		release?.poster?.thumbnail ||
		release?.poster?.optimized?.preview ||
		release?.poster?.preview;
	if (!path) {
		return undefined;
	}
	return path.startsWith('http') ? path : `${HOST_URL}${path}`;
};

class _AnilibriaApi extends ServiceApi {
	HOST_URL = HOST_URL;
	private hasLoadedHistory = false;

	constructor() {
		super(AnilibriaService.id);
	}

	override reset(): void {
		super.reset();
		this.hasLoadedHistory = false;
	}

	async checkLogin(): Promise<boolean> {
		try {
			const responseText = await this.sendSessionRequest(
				`${this.HOST_URL}/api/v1/accounts/users/me/profile`
			);
			const profile = JSON.parse(responseText) as AnilibriaProfileResponse;
			this.session = {
				profileName: profile.nickname ?? profile.login ?? profile.email ?? null,
			};
			return this.session.profileName !== null;
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log(`Failed to check login for ${this.id}`, err);
			}
			this.session = null;
			return false;
		}
	}

	async loadHistoryItems(_cancelKey = 'default'): Promise<AnilibriaHistoryItem[]> {
		if (this.hasLoadedHistory) {
			this.hasReachedHistoryEnd = true;
			return [];
		}

		const loggedIn = await this.checkLogin();
		if (!loggedIn) {
			this.hasReachedHistoryEnd = true;
			return [];
		}

		const responseText = await this.sendSessionRequest(
			`${this.HOST_URL}/api/v1/accounts/users/me/views/timecodes`
		);
		const rawTimecodes = JSON.parse(responseText) as AnilibriaRawTimecode[];
		const { anilibriaFirstImportedAt = {} } = (await browser.storage.local.get(
			'anilibriaFirstImportedAt'
		)) as { anilibriaFirstImportedAt?: Record<string, number> };
		const now = Utils.unix();
		let hasNewImportedAt = false;

		const historyItems = rawTimecodes
			.map((timecode) => ({
				releaseEpisodeId: timecode[0],
				time: Number(timecode[1]) || 0,
				isWatched: timecode[2] === true,
				firstImportedAt: anilibriaFirstImportedAt[timecode[0]] ?? now,
			}))
			.filter((timecode) => timecode.releaseEpisodeId && timecode.isWatched);

		for (const historyItem of historyItems) {
			if (!anilibriaFirstImportedAt[historyItem.releaseEpisodeId]) {
				anilibriaFirstImportedAt[historyItem.releaseEpisodeId] = historyItem.firstImportedAt;
				hasNewImportedAt = true;
			}
		}
		if (hasNewImportedAt) {
			await browser.storage.local.set({ anilibriaFirstImportedAt });
		}

		this.hasLoadedHistory = true;
		this.hasReachedHistoryEnd = true;
		return historyItems.sort((a, b) => b.firstImportedAt - a.firstImportedAt);
	}

	isNewHistoryItem(historyItem: AnilibriaHistoryItem, lastSync: number): boolean {
		return historyItem.firstImportedAt > lastSync;
	}

	getHistoryItemId(historyItem: AnilibriaHistoryItem): string {
		return historyItem.releaseEpisodeId;
	}

	async convertHistoryItems(historyItems: AnilibriaHistoryItem[]): Promise<ScrobbleItem[]> {
		const items = await Promise.all(
			historyItems.map(async (historyItem) => {
				const episode = await this.getEpisode(historyItem.releaseEpisodeId);
				return this.convertEpisode(episode, historyItem.firstImportedAt, 100);
			})
		);
		return items.filter((item): item is ScrobbleItem => item !== null);
	}

	updateItemFromHistory(item: ScrobbleItemValues, historyItem: AnilibriaHistoryItem): void {
		item.watchedAt = item.watchedAt ?? historyItem.firstImportedAt;
		item.progress = 100;
	}

	async getEpisode(
		releaseEpisodeId: string,
		cancelKey = 'default'
	): Promise<AnilibriaEpisodeResponse> {
		const responseText = await Requests.send({
			url: `${this.HOST_URL}/api/v1/anime/releases/episodes/${releaseEpisodeId}`,
			method: 'GET',
			cancelKey,
		});
		return JSON.parse(responseText) as AnilibriaEpisodeResponse;
	}

	private async sendSessionRequest(url: string): Promise<string> {
		const response = await fetch(url, {
			method: 'GET',
			credentials: 'include',
		});
		const text = await response.text();
		if (!response.ok) {
			throw new Error(text || `AniLibria request failed with status ${response.status}`);
		}
		return text;
	}

	convertEpisode(
		episode: AnilibriaEpisodeResponse,
		watchedAt?: number,
		progress?: number
	): ScrobbleItem | null {
		if (!episode.release) {
			return null;
		}

		const showTitle = getBestTitle(episode.release);
		if (!showTitle) {
			return null;
		}

		return new EpisodeItem({
			serviceId: this.id,
			id: episode.id,
			title: episode.name_english || episode.name || `Episode ${episode.ordinal ?? ''}`.trim(),
			season: 1,
			number: episode.ordinal ?? 0,
			isAbsolute: true,
			year: episode.release.year ?? undefined,
			watchedAt,
			progress,
			imageUrl: getImageUrl(episode.release),
			show: {
				serviceId: this.id,
				id: episode.release.id.toString(),
				title: showTitle,
			},
		});
	}
}

export const AnilibriaApi = new _AnilibriaApi();
