import { Suggestion } from '@apis/CorrectionApi';
import { Shared } from '@common/Shared';
import { SavedTraktItem, TraktItem } from '@models/TraktItem';

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

export interface IItem extends ItemBase {
	watchedAt?: number;
	trakt?: TraktItem | null;
	isHidden?: boolean;
	isSelected?: boolean;
	index?: number;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	isLoading?: boolean;
}

export interface SavedItem extends ItemBase {
	watchedAt?: number;
	trakt?: Omit<SavedTraktItem, ''> | null;
	suggestions?: Omit<Suggestion, ''>[] | null;
	imageUrl?: string | null;
	index?: number;
}

export interface ItemBase {
	serviceId: string;
	id?: string | null;
	type: 'show' | 'movie';
	title: string;
	year?: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	progress?: number;
}

//TODO this should be refactored or split into show and movie. Inheritance could be used to get the similarities.
export class Item implements IItem {
	serviceId: string;
	id: string;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	watchedAt?: number;
	progress: number;
	trakt?: TraktItem | null;
	isHidden: boolean;
	isSelected: boolean;
	index: number;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	isLoading: boolean;

	constructor(options: IItem) {
		this.serviceId = options.serviceId;
		this.type = options.type;
		this.title = correctTitles[options.title] || options.title;
		this.year = options.year ?? 0;
		if (this.type === 'show') {
			this.season = options.season;
			this.episode = options.episode;
			this.episodeTitle = options.episodeTitle;
		}
		this.watchedAt = options.watchedAt;
		this.progress = options.progress ? Math.round(options.progress * 100) / 100 : 0.0;
		this.trakt = options.trakt && new TraktItem(options.trakt); // Ensures immutability.
		this.isHidden = options.isHidden ?? false;
		this.isSelected = options.isSelected ?? false;
		this.index = options.index ?? 0;
		this.suggestions = options.suggestions;
		this.imageUrl = options.imageUrl;
		this.isLoading = options.isLoading ?? false;
		this.id = options.id || this.generateId();
	}

	static save(item: Item): SavedItem {
		return {
			serviceId: item.serviceId,
			id: item.id,
			type: item.type,
			title: item.title,
			year: item.year,
			season: item.season,
			episode: item.episode,
			episodeTitle: item.episodeTitle,
			watchedAt: item.watchedAt,
			progress: item.progress,
			trakt: item.trakt && TraktItem.save(item.trakt),
			suggestions: item.suggestions,
			imageUrl: item.imageUrl,
			index: item.index,
		};
	}

	static load(savedItem: SavedItem): Item {
		const options: IItem = {
			...savedItem,
			trakt: savedItem.trakt && TraktItem.load(savedItem.trakt),
		};

		return new Item(options);
	}

	/**
	 * Generates an ID for items that don't have an official ID from the streaming service.
	 *
	 * Examples:
	 *   - Show: `dark-s1-e1-secrets`
	 *   - Movie: `resident-evil-the-final-chapter`
	 */
	generateId() {
		const titleId = this.title.toLowerCase().replace(/[^A-Za-z0-9]/g, '');
		if (this.type === 'show') {
			const episodeTitleId = this.episodeTitle?.toLowerCase().replace(/[^A-Za-z0-9]/g, '') ?? '';
			return `${titleId}-s${this.season?.toString() ?? '0'}-e${
				this.episode?.toString() ?? '0'
			}-${episodeTitleId}`;
		}
		return titleId;
	}

	getFullTitle() {
		if (this.type === 'show') {
			return `${this.title} S${this.season?.toString() ?? '0'} E${
				this.episode?.toString() ?? '0'
			} - ${this.episodeTitle ?? 'Untitled'}`;
		}
		return `${this.title} (${this.year})`;
	}

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

	/**
	 * Clones the item for immutability.
	 */
	clone() {
		return new Item(this);
	}
}
