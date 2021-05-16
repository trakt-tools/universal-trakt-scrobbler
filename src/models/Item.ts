import * as moment from 'moment';
import { StreamingServiceId } from '../streaming-services/streaming-services';
import { SavedTraktItem, TraktItem } from './TraktItem';

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

export type IItem = ItemBase & ItemExtra;

export interface ItemBase {
	serviceId: StreamingServiceId;
	id: string;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	isCollection?: boolean;
}

export interface ItemExtra {
	watchedAt?: moment.Moment;
	percentageWatched?: number;
	trakt?: TraktItem | null;
	isSelected?: boolean;
	index?: number;
	correctionSuggestions?: CorrectionSuggestion[] | null;
	imageUrl?: string | null;
}

export interface CorrectionSuggestion {
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
	count: number;
}

export interface SavedItem extends ItemBase {
	watchedAt?: number;
	percentageWatched?: number;
	trakt?: Omit<SavedTraktItem, ''> | null;
}

//TODO this should be refactored or split into show and movie. Inheritance could be used to get the similarities.
export class Item implements IItem {
	serviceId: StreamingServiceId;
	id: string;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	isCollection?: boolean;
	watchedAt?: moment.Moment;
	percentageWatched?: number;
	trakt?: TraktItem | null;
	isSelected?: boolean;
	index?: number;
	correctionSuggestions?: CorrectionSuggestion[] | null;
	imageUrl?: string | null;

	constructor(options: IItem) {
		this.serviceId = options.serviceId;
		this.id = options.id;
		this.type = options.type;
		this.title = correctTitles[options.title] || options.title;
		this.year = options.year;
		if (this.type === 'show') {
			this.season = options.season;
			this.episode = options.episode;
			this.episodeTitle = options.episodeTitle;
			this.isCollection = options.isCollection;
		}
		this.watchedAt = options.watchedAt?.clone();
		this.percentageWatched = options.percentageWatched ?? 0;
		this.trakt = options.trakt && new TraktItem(options.trakt); // Ensures immutability.
		this.isSelected = options.isSelected;
		this.index = options.index;
		this.correctionSuggestions = options.correctionSuggestions;
		this.imageUrl = options.imageUrl;
	}

	static getBase = (item: Item): ItemBase => {
		return {
			serviceId: item.serviceId,
			id: item.id,
			type: item.type,
			title: item.title,
			year: item.year,
			season: item.season,
			episode: item.episode,
			episodeTitle: item.episodeTitle,
			isCollection: item.isCollection,
		};
	};

	static save = (item: Item): SavedItem => {
		return {
			...Item.getBase(item),
			watchedAt: item.watchedAt?.unix(),
			percentageWatched: item.percentageWatched,
			trakt: item.trakt && TraktItem.save(item.trakt),
		};
	};

	static load = (savedItem: SavedItem): Item => {
		const options: IItem = {
			...savedItem,
			watchedAt:
				typeof savedItem.watchedAt !== 'undefined' ? moment(savedItem.watchedAt * 1e3) : undefined,
			trakt: savedItem.trakt && TraktItem.load(savedItem.trakt),
		};
		return new Item(options);
	};

	getFullTitle = () => {
		if (this.type === 'show') {
			return `${this.title} S${this.season?.toString() ?? '0'} E${
				this.episode?.toString() ?? '0'
			} - ${this.episodeTitle ?? 'Untitled'}`;
		}
		return `${this.title} (${this.year})`;
	};

	isSelectable = () => {
		return this.trakt && !this.trakt.watchedAt;
	};
}
