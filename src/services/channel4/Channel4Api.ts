import { ServiceApi } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { MovieItem, EpisodeItem, ScrobbleItem, ScrobbleItemValues } from '@models/Item';
import { Channel4Service } from '@/channel4/Channel4Service';
import { Shared } from '@common/Shared';

export interface Channel4Root {
	history: { availableItems: Channel4HistoryItem[]; unavailableItems: Channel4HistoryItem[] };
	watching: { availableItems: Channel4HistoryItem[]; unavailableItems: Channel4HistoryItem[] };
}

export interface Channel4HistoryItem {
	brand: { title: string; websafeTitle: string; programmeType: string };
	episode: {
		seriesNumber: number;
		episodeNumber: number;
		programmeId: string;
		resume: { seconds: number; completed: boolean };
	};
}

export interface Channel4VodStream {
	webSafeBrandTitle: string;
	transcodeId: string;
}

class _Channel4Api extends ServiceApi {
	public session: { profileName: string } | null = null;
	public hasReachedHistoryEnd = false;
	public isActivated = false;

	private BASE_URL = 'https://www.channel4.com';
	private PROFILE_URL = `${this.BASE_URL}/identity/whoami`;
	private MYFOUR_URL = `${this.BASE_URL}/my4/api/v1/myfour.json`;

	private programmeCache = new Map<string, Channel4VodStream>();

	constructor() {
		super(Channel4Service.id);
	}

	async activate(): Promise<void> {
		try {
			const res = await Requests.send({ url: this.PROFILE_URL, method: 'GET' });
			const profile = JSON.parse(res);
			this.session = { profileName: profile.identity?.displayName };
			this.isActivated = true;
			console.log('[Channel4] Activated session for', this.session.profileName);
		} catch (err) {
			console.warn('[Channel4] Failed to activate session', err);
			this.session = null;
			this.isActivated = false;
		}
	}

	async checkLogin(): Promise<boolean> {
		if (!this.isActivated) await this.activate();
		return !!this.session?.profileName;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<Channel4HistoryItem[]> {
		await this.checkLogin();
		if (!this.session) {
			console.log('[Channel4] loadHistoryItems(): No session');
			return [];
		}

		try {
			const responseText = await Requests.send({ url: this.MYFOUR_URL, method: 'GET', cancelKey });
			const responseJson = JSON.parse(responseText) as Channel4Root;

			const responseItems: Channel4HistoryItem[] = [];
			(['availableItems'] as const).forEach((key) => {
				const watchingItems = responseJson.watching?.[key] ?? [];
				const historyItems = responseJson.history?.[key] ?? [];
				if (Array.isArray(watchingItems)) responseItems.push(...watchingItems);
				if (Array.isArray(historyItems)) responseItems.push(...historyItems);
			});

			this.hasReachedHistoryEnd = true;
			console.log(`[Channel4] loadHistoryItems() fetched ${responseItems.length} items`);
			return responseItems;
		} catch (err) {
			console.warn('[Channel4] Failed to load My4 history', err);
			this.hasReachedHistoryEnd = true;
			return [];
		}
	}

	private async getAssetId(programmeId: string): Promise<Channel4VodStream | null> {
		if (this.programmeCache.has(programmeId)) return this.programmeCache.get(programmeId)!;

		try {
			const res = await Requests.send({
				url: `${this.BASE_URL}/vod/stream/${programmeId}`,
				method: 'GET',
			});
			const data = JSON.parse(res);
			const meta: Channel4VodStream = {
				webSafeBrandTitle: data.webSafeBrandTitle,
				transcodeId: data.transcodeId,
			};
			this.programmeCache.set(programmeId, meta);
			return meta;
		} catch (err) {
			console.warn(`[Channel4] Failed to fetch stream meta for ${programmeId}`, err);
			return null;
		}
	}

	private async getAssetData(webSafeBrandTitle: string, transcodeId: string): Promise<any | null> {
		try {
			const res = await Requests.send({
				url: `${this.BASE_URL}/player/${webSafeBrandTitle}/asset/${transcodeId}?json=true`,
				method: 'GET',
			});
			const data = JSON.parse(res);

			const asset = data.asset ?? null;
			const episodeData = data.actions?.[0]?.playNextEpisode ?? null;

			if (!asset) return null;

			return {
				...asset,
				summary: episodeData?.summary,
				synopsis: episodeData?.synopsis,
				shortSynopsis: episodeData?.shortSynopsis,
				secondarySynopsis: episodeData?.secondarySynopsis,
				secondaryShortSynopsis: episodeData?.secondaryShortSynopsis,
			};
		} catch (err) {
			console.warn(`[Channel4] Failed to fetch asset for ${webSafeBrandTitle}/${transcodeId}`, err);
			return null;
		}
	}

	async convertHistoryItems(items: Channel4HistoryItem[]): Promise<ScrobbleItem[]> {
		console.log(`[Channel4] convertHistoryItems(): processing ${items.length} items`);

		const processed = await Promise.all(
			items.map(async (item) => {
				const programmeId = item.episode?.programmeId;
				if (!programmeId) return null;

				const scrobbleItem = await this.getItem(programmeId, item);
				return scrobbleItem;
			})
		);

		const results = processed.filter((i): i is ScrobbleItem => !!i);
		results.sort((a, b) => (!a.watchedAt ? 1 : !b.watchedAt ? -1 : b.watchedAt - a.watchedAt));

		console.log('[Channel4] convertHistoryItems() finished:', {
			count: results.length,
			sample: results
				.slice(0, 5)
				.map((i) => ({ id: i.id, title: i.title, watchedAt: i.watchedAt })),
		});

		return results;
	}

	getHistoryItemId(item: Channel4HistoryItem): string {
		return item.episode?.programmeId ?? '';
	}

	isNewHistoryItem(historyItem: Channel4HistoryItem, lastSync: number): boolean {
		const watchedAt = historyItem.episode?.resume?.completed
			? Math.floor(Date.now() / 1000)
			: historyItem.episode?.resume?.seconds
				? Math.floor(Date.now() / 1000)
				: undefined;
		return watchedAt ? watchedAt > lastSync : false;
	}

	updateItemFromHistory(
		item: ScrobbleItemValues,
		historyItem: Channel4HistoryItem,
		assetResumeTimeStamp?: number,
		assetDuration?: number
	): void {
		const completed = historyItem.episode?.resume?.completed ?? false;
		const secondsWatched = historyItem.episode?.resume?.seconds ?? 0;
		const duration = assetDuration ?? 1;
		item.progress = completed ? 100 : Math.min((secondsWatched / duration) * 100, 99);
		const watchedAt = assetResumeTimeStamp ? Math.floor(assetResumeTimeStamp / 1000) : undefined;
		if (watchedAt !== undefined) item.watchedAt = watchedAt;
	}

	async getItem(
		programmeId: string,
		historyItem?: Channel4HistoryItem
	): Promise<ScrobbleItem | null> {
		if (!this.isActivated) await this.activate();
		if (!this.session) throw new Error('Invalid session');

		try {
			const meta = await this.getAssetId(programmeId);
			if (!meta) return null;

			const asset = await this.getAssetData(meta.webSafeBrandTitle, meta.transcodeId);
			if (!asset) return null;

			const completed = historyItem?.episode?.resume?.completed ?? false;
			const secondsWatched = historyItem?.episode?.resume?.seconds ?? asset.resumeSeconds ?? 0;

			const progress = completed
				? 100
				: Math.min((secondsWatched / (asset.assetDuration ?? 1)) * 100, 99);

			const watchedAt = asset.resumeTimeStamp
				? Math.floor(Number(asset.resumeTimeStamp) / 1000)
				: undefined;

			const isFilm = asset.programmeType === 'FM' || historyItem?.brand?.programmeType === 'FM';

			const yearMatch =
				asset.summary?.match(/^\((\d{4})\)/) ||
				asset.synopsis?.match(/^\((\d{4})\)/) ||
				asset.shortSynopsis?.match(/^\((\d{4})\)/) ||
				asset.secondarySynopsis?.match(/^\((\d{4})\)/) ||
				asset.secondaryShortSynopsis?.match(/^\((\d{4})\)/);

			const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

			if (isFilm) {
				return new MovieItem({
					serviceId: this.id,
					id: asset.assetId,
					title: asset.brandTitle,
					year,
					watchedAt,
					progress,
				});
			}

			return new EpisodeItem({
				serviceId: this.id,
				id: asset.assetId,
				title: asset.episodeSecondaryTitle || asset.episodeTitle,
				season: asset.seriesNumber ?? 0,
				number: asset.episodeNumber ?? 0,
				watchedAt,
				progress,
				show: { serviceId: this.id, title: asset.brandTitle },
			});
		} catch (err) {
			if (Shared.errors.validate(err)) Shared.errors.error('Failed to get Channel4 item.', err);
			return null;
		}
	}
}

export const Channel4Api = new _Channel4Api();
