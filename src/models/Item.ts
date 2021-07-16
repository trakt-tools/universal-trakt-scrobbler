import { Suggestion } from '@apis/WrongItemApi';
import { BrowserStorage } from '@common/BrowserStorage';
import { SavedTraktItem, TraktItem } from '@models/TraktItem';
import * as moment from 'moment';

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
	watchedAt?: moment.Moment;
	trakt?: TraktItem | null;
	isSelected?: boolean;
	index?: number;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
}

export interface SavedItem extends ItemBase {
	watchedAt?: number;
	trakt?: Omit<SavedTraktItem, ''> | null;
	suggestions?: Omit<Suggestion, ''>[] | null;
	imageUrl?: string | null;
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
	watchedAt?: moment.Moment;
	progress: number;
	trakt?: TraktItem | null;
	isSelected?: boolean;
	index?: number;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;

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
		this.watchedAt = options.watchedAt?.clone();
		this.progress = options.progress ? Math.round(options.progress * 100) / 100 : 0.0;
		this.trakt = options.trakt && new TraktItem(options.trakt); // Ensures immutability.
		this.isSelected = options.isSelected;
		this.index = options.index;
		this.suggestions = options.suggestions;
		this.imageUrl = options.imageUrl;
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
			watchedAt: item.watchedAt?.unix(),
			progress: item.progress,
			trakt: item.trakt && TraktItem.save(item.trakt),
			suggestions: item.suggestions,
			imageUrl: item.imageUrl,
		};
	}

	static load(savedItem: SavedItem): Item {
		const options: IItem = {
			...savedItem,
			watchedAt:
				typeof savedItem.watchedAt !== 'undefined' ? moment(savedItem.watchedAt * 1e3) : undefined,
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

	isSelectable() {
		return this.trakt && !this.trakt.watchedAt;
	}

	isMissingWatchedDate() {
		const { addWithReleaseDate, addWithReleaseDateMissing } = BrowserStorage.syncOptions;
		if (addWithReleaseDate) {
			if (addWithReleaseDateMissing) {
				return !this.watchedAt && !this.trakt?.releaseDate;
			}
			return !this.trakt?.releaseDate;
		}
		return !this.watchedAt;
	}

	getWatchedDate() {
		const { addWithReleaseDate, addWithReleaseDateMissing } = BrowserStorage.syncOptions;
		if (addWithReleaseDate) {
			if (addWithReleaseDateMissing) {
				return this.watchedAt ?? this.trakt?.releaseDate;
			}
			return this.trakt?.releaseDate;
		}
		return this.watchedAt;
	}
}
