import { Moment } from 'moment';

export type ITraktItem = TraktItemBase & TraktItemExtra;

export interface TraktItemBase {
	id: number;
	tmdbId: number;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	releaseDate: string | null;
}

export interface TraktItemExtra {
	watchedAt?: Moment;
	progress?: number;
}

export class TraktItem implements ITraktItem {
	id: number;
	tmdbId: number;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	releaseDate: string | null;
	watchedAt?: Moment;
	progress: number;

	constructor(options: ITraktItem) {
		this.id = options.id;
		this.tmdbId = options.tmdbId;
		this.type = options.type;
		this.title = options.title;
		this.year = options.year;
		if (this.type === 'show') {
			this.season = options.season;
			this.episode = options.episode;
			this.episodeTitle = options.episodeTitle;
		}
		this.releaseDate = options.releaseDate;
		this.watchedAt = options.watchedAt?.clone();
		this.progress = options.progress ?? 0;
	}

	static getBase = (item: TraktItem): TraktItemBase => {
		return {
			id: item.id,
			tmdbId: item.tmdbId,
			type: item.type,
			title: item.title,
			year: item.year,
			season: item.season,
			episode: item.episode,
			episodeTitle: item.episodeTitle,
			releaseDate: item.releaseDate,
		};
	};
}
