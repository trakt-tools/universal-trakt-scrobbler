export interface ITraktItem extends TraktItemBase {
	releaseDate?: number;
	watchedAt?: number | null;
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
	watchedAt?: number | null;
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
	releaseDate?: number;
	syncId?: number;
	watchedAt?: number | null;
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
		this.syncId = options.syncId;
		this.watchedAt = options.watchedAt;
		this.progress = options.progress ? Math.round(options.progress * 100) / 100 : 0.0;
	}

	static save(item: TraktItem): SavedTraktItem {
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
			syncId: item.syncId,
			watchedAt: item.watchedAt,
			progress: item.progress,
		};
	}

	static load(savedItem: SavedTraktItem): TraktItem {
		const options: ITraktItem = {
			...savedItem,
		};
		return new TraktItem(options);
	}

	/**
	 * Returns the ID used to uniquely identify the item in the database.
	 */
	getDatabaseId() {
		return `${this.type === 'show' ? 'episode' : 'movie'}_${this.id.toString()}`;
	}

	/**
	 * Clones the item for immutability.
	 */
	clone() {
		return new TraktItem(this);
	}
}
