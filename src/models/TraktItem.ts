export type TraktItem = TraktScrobbleItem | TraktShowItem;

export type TraktScrobbleItem = TraktEpisodeItem | TraktMovieItem;

export type TraktItemValues = TraktScrobbleItemValues | TraktShowItemValues;

export type TraktScrobbleItemValues = TraktEpisodeItemValues | TraktMovieItemValues;

export interface TraktBaseItemValues {
	id: number;
	tmdbId: number;
	syncId?: number;
	title: string;
	year: number;
	releaseDate?: number;
	watchedAt?: number | null;
	progress?: number;
}

export interface TraktEpisodeItemValues extends TraktBaseItemValues {
	type: 'episode';
	season: number;
	number: number;
	show: TraktShowItemValues;
}

export type TraktEpisodeItemParams = Omit<TraktEpisodeItemValues, 'type' | 'show'> & {
	show: Omit<TraktShowItemValues, 'type'>;
};

export interface TraktShowItemValues extends TraktBaseItemValues {
	type: 'show';
}

export type TraktShowItemParams = Omit<TraktShowItemValues, 'type'>;

export interface TraktMovieItemValues extends TraktBaseItemValues {
	type: 'movie';
}

export type TraktMovieItemParams = Omit<TraktMovieItemValues, 'type'>;

abstract class TraktBaseItem implements TraktBaseItemValues {
	id: number;
	tmdbId: number;
	syncId?: number;
	title: string;
	year: number;
	releaseDate?: number;
	watchedAt?: number | null;
	progress: number;

	constructor(values: TraktBaseItemValues) {
		this.id = values.id;
		this.tmdbId = values.tmdbId;
		this.syncId = values.syncId;
		this.title = values.title;
		this.year = values.year;
		this.releaseDate = values.releaseDate;
		this.watchedAt = values.watchedAt;
		this.progress = values.progress ? Math.round(values.progress * 100) / 100 : 0.0;
	}

	save(): TraktBaseItemValues {
		return {
			id: this.id,
			tmdbId: this.tmdbId,
			syncId: this.syncId,
			title: this.title,
			year: this.year,
			releaseDate: this.releaseDate,
			watchedAt: this.watchedAt,
			progress: this.progress,
		};
	}

	/**
	 * Returns the ID used to uniquely identify the item in the database.
	 */
	abstract getDatabaseId(): string;

	abstract getHistoryUrl(): string;

	/**
	 * Clones the item for immutability.
	 */
	abstract clone(): TraktItem;
}

export class TraktEpisodeItem extends TraktBaseItem implements TraktEpisodeItemValues {
	type = 'episode' as const;
	season: number;
	number: number;
	show: TraktShowItem;

	constructor(values: TraktEpisodeItemParams) {
		super(values);
		this.season = values.season;
		this.number = values.number;
		this.show = new TraktShowItem(values.show);
	}

	save(): TraktEpisodeItemValues {
		return {
			...super.save(),
			type: this.type,
			season: this.season,
			number: this.number,
			show: this.show.save(),
		};
	}

	getDatabaseId(): string {
		return `episode_${this.id.toString()}`;
	}

	getHistoryUrl(): string {
		return `https://trakt.tv/users/me/history?episode=${this.id}`;
	}

	clone(): TraktEpisodeItem {
		return new TraktEpisodeItem(this);
	}
}

export class TraktShowItem extends TraktBaseItem implements TraktShowItemValues {
	type = 'show' as const;

	constructor(values: TraktShowItemParams) {
		super(values);
	}

	save(): TraktShowItemValues {
		return {
			...super.save(),
			type: this.type,
		};
	}

	getDatabaseId(): string {
		return `show_${this.id.toString()}`;
	}

	getHistoryUrl(): string {
		return `https://trakt.tv/users/me/history/episodes?show=${this.id}`;
	}

	clone(): TraktShowItem {
		return new TraktShowItem(this);
	}
}

export class TraktMovieItem extends TraktBaseItem implements TraktMovieItemValues {
	type = 'movie' as const;

	constructor(values: TraktMovieItemParams) {
		super(values);
	}

	save(): TraktMovieItemValues {
		return {
			...super.save(),
			type: this.type,
		};
	}

	getDatabaseId(): string {
		return `movie_${this.id.toString()}`;
	}

	getHistoryUrl(): string {
		return `https://trakt.tv/users/me/history?movie=${this.id}`;
	}

	clone(): TraktMovieItem {
		return new TraktMovieItem(this);
	}
}

export const createTraktItem = (values: TraktItemValues): TraktItem => {
	switch (values.type) {
		case 'show':
			return new TraktShowItem(values);

		default:
			return createTraktScrobbleItem(values);
	}
};

export const createTraktScrobbleItem = (values: TraktScrobbleItemValues): TraktScrobbleItem => {
	switch (values.type) {
		case 'episode':
			return new TraktEpisodeItem(values);

		case 'movie':
			return new TraktMovieItem(values);
	}
};

export const isTraktItem = (item: unknown): item is TraktItem => {
	return item instanceof TraktBaseItem;
};
