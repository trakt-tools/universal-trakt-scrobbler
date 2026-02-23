import { ServiceApi } from '@apis/ServiceApi';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
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
	showTitle?: string;
	watchedAt: number;
}

const RUSSIAN_MONTHS: Record<string, number> = {
	января: 0,
	февраля: 1,
	марта: 2,
	апреля: 3,
	мая: 4,
	июня: 5,
	июля: 6,
	августа: 7,
	сентября: 8,
	октября: 9,
	ноября: 10,
	декабря: 11,
};

class _KinoPubApi extends ServiceApi {
	HOST_URL = 'https://kino.pub';
	private phase: 'movies' | 'episodes' = 'movies';
	private username = '';

	constructor() {
		super(KinoPubService.id);
	}

	override reset(): void {
		super.reset();
		this.phase = 'movies';
		this.username = '';
	}

	async checkLogin(): Promise<boolean> {
		try {
			const responseText = await Requests.send({
				url: `${this.HOST_URL}/history`,
				method: 'GET',
			});
			const usernameMatch = /\/watchlist\/([^"\/\s]+)/.exec(responseText);
			if (usernameMatch) {
				this.username = usernameMatch[1];
				return true;
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.log(`Failed to check login for ${this.id}`, err);
			}
		}
		return false;
	}

	async loadHistoryItems(cancelKey = 'default'): Promise<KinoPubHistoryItem[]> {
		if (!this.username) {
			const loggedIn = await this.checkLogin();
			if (!loggedIn) {
				this.hasReachedHistoryEnd = true;
				return [];
			}
		}

		if (this.nextHistoryUrl === 'episodes') {
			this.phase = 'episodes';
		}

		const isEpisodes = this.phase === 'episodes';
		const url = `${this.HOST_URL}/history/index/${this.username}${isEpisodes ? '/episodes' : ''}?page=${this.nextHistoryPage + 1}&per-page=50`;

		const responseText = await Requests.send({
			url,
			method: 'GET',
			cancelKey,
		});

		const items = isEpisodes
			? this.parseEpisodesHtml(responseText)
			: this.parseMoviesHtml(responseText);

		if (items.length < 50) {
			if (this.phase === 'movies') {
				this.phase = 'episodes';
				this.nextHistoryPage = 0;
				this.nextHistoryUrl = 'episodes';
			} else {
				this.hasReachedHistoryEnd = true;
			}
		} else {
			this.nextHistoryPage += 1;
		}

		return items;
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
					title: '',
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

	private parseMoviesHtml(html: string): KinoPubHistoryItem[] {
		const items: KinoPubHistoryItem[] = [];
		const sections = html.split(/<h4[^>]*>/);

		for (const section of sections) {
			const dateMatch = /^([\s\S]*?)<\/h4>/.exec(section);
			if (!dateMatch) continue;
			const dateText = dateMatch[1].replace(/<[^>]+>/g, '').trim();
			const watchedAt = this.parseDate(dateText);
			if (!watchedAt) continue;

			const itemStarts: { mediaId: string; index: number }[] = [];
			const mediaRegex = /id="media-(\d+)"/g;
			let m: RegExpExecArray | null;
			while ((m = mediaRegex.exec(section)) !== null) {
				itemStarts.push({ mediaId: m[1], index: m.index });
			}

			for (let i = 0; i < itemStarts.length; i++) {
				const start = itemStarts[i].index;
				const end = i + 1 < itemStarts.length ? itemStarts[i + 1].index : section.length;
				const chunk = section.slice(start, end);

				const hrefMatch = /href="\/item\/view\/(\d+)\/[^"]*"/.exec(chunk);
				if (!hrefMatch) continue;
				const itemId = hrefMatch[1];

				const titleMatch = /class="item-title[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/.exec(chunk);
				const authorMatches = [
					...chunk.matchAll(/class="item-author[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g),
				];
				const yearMatch = /(\d{4}),\s*<span/.exec(chunk);

				const russianTitle = titleMatch?.[1]?.replace(/&nbsp;/g, ' ').trim() ?? '';
				const englishTitle = authorMatches[0]?.[1]?.replace(/&nbsp;/g, ' ').trim() ?? '';
				const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined;

				items.push({
					mediaId: itemStarts[i].mediaId,
					itemId,
					type: 'movie',
					title: englishTitle || russianTitle,
					year,
					watchedAt,
				});
			}
		}

		return items;
	}

	private parseEpisodesHtml(html: string): KinoPubHistoryItem[] {
		const items: KinoPubHistoryItem[] = [];
		const sections = html.split(/<h4[^>]*>/);

		for (const section of sections) {
			const dateMatch = /^([\s\S]*?)<\/h4>/.exec(section);
			if (!dateMatch) continue;
			const dateText = dateMatch[1].replace(/<[^>]+>/g, '').trim();
			const watchedAt = this.parseDate(dateText);
			if (!watchedAt) continue;

			const itemStarts: { mediaId: string; index: number }[] = [];
			const mediaRegex = /id="media-(\d+)"/g;
			let m: RegExpExecArray | null;
			while ((m = mediaRegex.exec(section)) !== null) {
				itemStarts.push({ mediaId: m[1], index: m.index });
			}

			for (let i = 0; i < itemStarts.length; i++) {
				const start = itemStarts[i].index;
				const end = i + 1 < itemStarts.length ? itemStarts[i + 1].index : section.length;
				const chunk = section.slice(start, end);

				const hrefMatch = /href="\/item\/view\/(\d+)\/s(\d+)e(\d+)"/.exec(chunk);
				if (!hrefMatch) continue;
				const itemId = hrefMatch[1];
				const season = Number.parseInt(hrefMatch[2], 10);
				const episode = Number.parseInt(hrefMatch[3], 10);

				const titleMatch = /class="item-title[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/.exec(chunk);
				const authorMatch = /class="item-author[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/.exec(chunk);

				const russianTitle = titleMatch?.[1]?.replace(/&nbsp;/g, ' ').trim() ?? '';
				const englishTitle = authorMatch?.[1]?.replace(/&nbsp;/g, ' ').trim() ?? '';

				items.push({
					mediaId: itemStarts[i].mediaId,
					itemId,
					type: 'episode',
					title: englishTitle || russianTitle,
					season,
					episode,
					showTitle: englishTitle || russianTitle,
					watchedAt,
				});
			}
		}

		return items;
	}

	private parseDate(dateStr: string): number {
		const parts = dateStr.split(/\s+/);
		if (parts.length === 3) {
			const day = Number.parseInt(parts[0], 10);
			const monthStr = parts[1].toLowerCase();
			const year = Number.parseInt(parts[2], 10);
			const month = RUSSIAN_MONTHS[monthStr];
			if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
				return Utils.unix(new Date(year, month, day));
			}
		}
		const date = new Date(dateStr);
		if (!Number.isNaN(date.getTime())) {
			return Utils.unix(date);
		}
		return 0;
	}
}

export const KinoPubApi = new _KinoPubApi();
