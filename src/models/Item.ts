import { TraktItem } from './TraktItem';

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

export interface IItem {
	id: string;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	isCollection?: boolean;
	watchedAt?: import('moment').Moment;
	percentageWatched?: number;
	trakt?: TraktItem | null;
	isSelected?: boolean;
	index?: number;
}

//TODO this should be refactored or split into show and movie. Inheritance could be used to get the similarities.
export class Item implements IItem {
	id: string;
	type: 'show' | 'movie';
	title: string;
	year: number;
	season?: number;
	episode?: number;
	episodeTitle?: string;
	isCollection?: boolean;
	watchedAt?: import('moment').Moment;
	percentageWatched: number;
	trakt?: TraktItem | null;
	isSelected?: boolean;
	index?: number;

	constructor(options: IItem) {
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
		this.percentageWatched = options.percentageWatched ?? 0;
		this.watchedAt = options.watchedAt;
		this.trakt = options.trakt;
	}
}
