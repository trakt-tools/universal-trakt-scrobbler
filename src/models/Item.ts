import { Suggestion } from '@apis/CorrectionApi';
import { Shared } from '@common/Shared';
import {
	TraktEpisodeItem,
	TraktEpisodeItemParams,
	TraktEpisodeItemValues,
	TraktItem,
	TraktMovieItem,
	TraktMovieItemParams,
	TraktMovieItemValues,
	TraktShowItem,
	TraktShowItemParams,
	TraktShowItemValues,
} from '@models/TraktItem';

// We use this to correct known wrong titles.
const correctTitles: Record<string, string> = {
	['Dynasty']: 'Dynasty reboot',
	['Shameless (U.S.)']: 'Shameless',
	['Star Wars: The Clone Wars']: '"Star Wars: The Clone Wars"',
	['The 100']: '"The 100"',
	['The Avengers']: '"The Avengers"',
	['The Blind Side']: '"The Blind Side"',
	['The House of Cards Trilogy (BBC)']: 'The House of Cards',
	['The Office (U.S.)']: 'The Office (US)',
	['The Seven Deadly Sins']: '"The Seven Deadly Sins"',
	['Young and Hungry']: '"Young and Hungry"',
};

export type Item = ScrobbleItem | ShowItem;

export type ScrobbleItem = EpisodeItem | MovieItem;

export type ItemValues = ScrobbleItemValues | ShowItemValues;

export type ScrobbleItemValues = EpisodeItemValues | MovieItemValues;

export interface BaseItemValues {
	serviceId: string;
	id?: string | null;
	title: string;
	year?: number;
	watchedAt?: number;
	progress?: number;
	isHidden?: boolean;
	isSelected?: boolean;
	index?: number;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	isLoading?: boolean;
}

export type EpisodeItemParams = Omit<EpisodeItemValues, 'type' | 'show' | 'trakt'> & {
	show: Omit<ShowItemValues, 'type'>;
	trakt?: TraktEpisodeItemParams | null;
};

export interface EpisodeItemValues extends BaseItemValues {
	type: 'episode';
	season: number;
	number: number;
	show: ShowItemValues;
	trakt?: TraktEpisodeItemValues | null;
}

export type ShowItemParams = Omit<ShowItemValues, 'type' | 'trakt'> & {
	trakt?: TraktShowItemParams | null;
};

export interface ShowItemValues extends BaseItemValues {
	type: 'show';
	trakt?: TraktShowItemValues | null;
}

export type MovieItemParams = Omit<MovieItemValues, 'type' | 'trakt'> & {
	trakt?: TraktMovieItemParams | null;
};

export interface MovieItemValues extends BaseItemValues {
	type: 'movie';
	trakt?: TraktMovieItemValues | null;
}

abstract class BaseItem implements BaseItemValues {
	serviceId: string;
	id: string;
	title: string;
	year: number;
	watchedAt?: number;
	progress: number;
	isHidden: boolean;
	isSelected: boolean;
	index: number;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	isLoading: boolean;
	trakt?: TraktItem | null;

	constructor(values: BaseItemValues) {
		this.serviceId = values.serviceId;
		this.title = correctTitles[values.title] || values.title;
		this.year = values.year ?? 0;
		this.watchedAt = values.watchedAt;
		this.progress = values.progress ? Math.round(values.progress * 100) / 100 : 0.0;
		this.isHidden = values.isHidden ?? false;
		this.isSelected = values.isSelected ?? false;
		this.index = values.index ?? 0;
		this.suggestions = values.suggestions;
		this.imageUrl = values.imageUrl;
		this.isLoading = values.isLoading ?? false;
		this.id = values.id || this.generateId();
	}

	save(): BaseItemValues {
		return {
			serviceId: this.serviceId,
			id: this.id,
			title: this.title,
			year: this.year,
			watchedAt: this.watchedAt,
			progress: this.progress,
			index: this.index,
			suggestions: this.suggestions,
			imageUrl: this.imageUrl,
		};
	}

	/**
	 * Generates an ID for items that don't have an official ID from the streaming service.
	 *
	 * Examples:
	 *   - Show: `dark-s1-e1-secrets`
	 *   - Movie: `resident-evil-the-final-chapter`
	 */
	abstract generateId(): string;

	abstract getFullTitle(): string;

	/**
	 * Clones the item for immutability.
	 */
	abstract clone(): Item;

	doHide() {
		return (
			(Shared.storage.syncOptions.hideSynced && this.trakt && !!this.trakt.watchedAt) ||
			this.progress < Shared.storage.syncOptions.minPercentageWatched
		);
	}

	isSelectable() {
		return !this.isLoading && !!this.trakt && !this.trakt.watchedAt && !this.doHide();
	}

	isMissingWatchedDate() {
		const { addWithReleaseDate, addWithReleaseDateMissing } = Shared.storage.syncOptions;
		if (addWithReleaseDate) {
			if (addWithReleaseDateMissing) {
				return !this.watchedAt && !this.trakt?.releaseDate;
			}
			return !this.trakt?.releaseDate;
		}
		return !this.watchedAt;
	}

	getWatchedDate() {
		const { addWithReleaseDate, addWithReleaseDateMissing } = Shared.storage.syncOptions;
		if (addWithReleaseDate) {
			if (addWithReleaseDateMissing) {
				return this.watchedAt ?? this.trakt?.releaseDate;
			}
			return this.trakt?.releaseDate;
		}
		return this.watchedAt;
	}

	/**
	 * Returns the ID used to uniquely identify the item in the database.
	 */
	getDatabaseId() {
		return `${this.serviceId}_${this.id}`;
	}
}

export class EpisodeItem extends BaseItem implements EpisodeItemValues {
	type = 'episode' as const;
	season: number;
	number: number;
	show: ShowItem;
	trakt?: TraktEpisodeItem | null;

	constructor(values: EpisodeItemParams) {
		super(values);
		this.season = values.season;
		this.number = values.number;
		this.show = new ShowItem(values.show);
		this.trakt = values.trakt && new TraktEpisodeItem(values.trakt);
	}

	save(): EpisodeItemValues {
		return {
			...super.save(),
			type: this.type,
			season: this.season,
			number: this.number,
			show: this.show.save(),
			trakt: this.trakt?.save(),
		};
	}

	generateId(): string {
		return `${this.show.title.toLowerCase().replace(/[^A-Za-z0-9]/g, '')}-s${
			this.season?.toString() ?? '0'
		}-e${this.number?.toString() ?? '0'}-${
			this.title?.toLowerCase().replace(/[^A-Za-z0-9]/g, '') ?? ''
		}`;
	}

	getFullTitle(): string {
		return `${this.show.title} S${this.season?.toString() ?? '0'} E${
			this.number?.toString() ?? '0'
		} - ${this.title ?? 'Untitled'}`;
	}

	clone(): EpisodeItem {
		return new EpisodeItem(this);
	}
}

export class ShowItem extends BaseItem implements ShowItemValues {
	type = 'show' as const;
	trakt?: TraktShowItem | null;

	constructor(values: ShowItemParams) {
		super(values);
		this.trakt = values.trakt && new TraktShowItem(values.trakt);
	}

	save(): ShowItemValues {
		return {
			...super.save(),
			type: this.type,
			trakt: this.trakt?.save(),
		};
	}

	generateId(): string {
		return this.title.toLowerCase().replace(/[^A-Za-z0-9]/g, '');
	}

	getFullTitle(): string {
		return `${this.title} (${this.year})`;
	}

	clone(): ShowItem {
		return new ShowItem(this);
	}
}

export class MovieItem extends BaseItem implements MovieItemValues {
	type = 'movie' as const;
	trakt?: TraktMovieItem | null;

	constructor(values: ShowItemParams) {
		super(values);
		this.trakt = values.trakt && new TraktMovieItem(values.trakt);
	}

	save(): MovieItemValues {
		return {
			...super.save(),
			type: this.type,
			trakt: this.trakt?.save(),
		};
	}

	generateId(): string {
		return this.title.toLowerCase().replace(/[^A-Za-z0-9]/g, '');
	}

	getFullTitle(): string {
		return `${this.title} (${this.year})`;
	}

	clone(): MovieItem {
		return new MovieItem(this);
	}
}

export const createItem = (values: ItemValues): Item => {
	switch (values.type) {
		case 'show':
			return new ShowItem(values);

		default:
			return createScrobbleItem(values);
	}
};

export const createScrobbleItem = (values: ScrobbleItemValues): ScrobbleItem => {
	switch (values.type) {
		case 'episode':
			return new EpisodeItem(values);

		case 'movie':
			return new MovieItem(values);
	}
};

export const isItem = (item: unknown): item is Item => {
	return item instanceof BaseItem;
};
