import * as moment from 'moment';

export interface ITraktItem extends TraktItemBase {
	releaseDate?: moment.Moment;
	watchedAt?: moment.Moment;
}

export interface TraktItemBase {
	id: number;
	tmdbId: number;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	syncId?: number;
	progress?: number;
}

export interface SavedTraktItem extends TraktItemBase {
	releaseDate?: number;
	watchedAt?: number;
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
	releaseDate?: moment.Moment;
	syncId?: number;
	watchedAt?: moment.Moment;
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
		this.releaseDate = options.releaseDate?.clone();
		this.syncId = options.syncId;
		this.watchedAt = options.watchedAt?.clone();
		this.progress = options.progress ?? 0;
	}

	static save = (item: TraktItem): SavedTraktItem => {
		return {
			id: item.id,
			tmdbId: item.tmdbId,
			type: item.type,
			title: item.title,
			year: item.year,
			season: item.season,
			episode: item.episode,
			episodeTitle: item.episodeTitle,
			releaseDate: item.releaseDate?.unix(),
			syncId: item.syncId,
			watchedAt: item.watchedAt?.unix(),
			progress: item.progress,
		};
	};

	static load = (savedItem: SavedTraktItem): TraktItem => {
		const options: ITraktItem = {
			...savedItem,
			releaseDate:
				typeof savedItem.releaseDate !== 'undefined'
					? moment(savedItem.releaseDate * 1e3)
					: undefined,
			watchedAt:
				typeof savedItem.watchedAt !== 'undefined' ? moment(savedItem.watchedAt * 1e3) : undefined,
		};
		return new TraktItem(options);
	};
}
