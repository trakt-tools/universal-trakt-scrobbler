import { Item } from '../models/Item';
import { SyncItem } from '../models/SyncItem';
import { EventDispatcher, Events } from '../services/Events';
import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

export type TraktSearchItem = TraktSearchShowItem | TraktSearchMovieItem;

export type TraktSearchEpisodeItem = TraktEpisodeItem & TraktSearchShowItem;

export interface TraktEpisodeItem {
	episode: TraktEpisodeItemEpisode;
}

export interface TraktEpisodeItemEpisode {
	season: number;
	number: number;
	title: string;
	ids: {
		trakt: number;
	};
}

export interface TraktSearchShowItem {
	show: TraktSearchShowItemShow;
}

export interface TraktSearchShowItemShow {
	title: string;
	year: number;
	ids: {
		trakt: number;
	};
}

export interface TraktSearchMovieItem {
	movie: TraktSearchMovieItemMovie;
}

export interface TraktSearchMovieItemMovie {
	title: string;
	year: number;
	ids: {
		trakt: number;
	};
}

class _TraktSearch extends TraktApi {
	constructor() {
		super();

		this.find = this.find.bind(this);
		this.findItem = this.findItem.bind(this);
		this.findEpisode = this.findEpisode.bind(this);
		this.findEpisodeByTitle = this.findEpisodeByTitle.bind(this);
		this.getEpisodeUrl = this.getEpisodeUrl.bind(this);
		this.formatEpisodeTitle = this.formatEpisodeTitle.bind(this);
	}

	async find(item: Item): Promise<SyncItem | undefined> {
		let syncItem: SyncItem | undefined;
		try {
			let searchItem: TraktSearchEpisodeItem | TraktSearchMovieItem;
			if (item.type === 'show') {
				searchItem = await this.findEpisode(item);
			} else {
				searchItem = (await this.findItem(item)) as TraktSearchMovieItem;
			}
			if (item.type === 'show') {
				const episodeItem = searchItem as TraktSearchEpisodeItem; //TODO can probably avoid assertion with clever generics
				const id = episodeItem.episode.ids.trakt;
				const title = episodeItem.show.title;
				const year = episodeItem.show.year;
				const season = episodeItem.episode.season;
				const episode = episodeItem.episode.number;
				const episodeTitle = episodeItem.episode.title;
				syncItem = new SyncItem({
					id,
					type: item.type,
					title,
					year,
					season,
					episode,
					episodeTitle,
				});
			} else {
				const movieItem = searchItem as TraktSearchMovieItem; //TODO can probably avoid assertion with clever generics
				const id = movieItem.movie.ids.trakt;
				const title = movieItem.movie.title;
				const year = movieItem.movie.year;
				syncItem = new SyncItem({ id, type: item.type, title, year });
			}
			await EventDispatcher.dispatch(Events.SEARCH_SUCCESS, { searchItem });
		} catch (err) {
			await EventDispatcher.dispatch(Events.SEARCH_ERROR, { error: err as Error });
		}
		return syncItem;
	}

	async findItem(item: Item): Promise<TraktSearchItem> {
		let searchItem: TraktSearchItem | undefined;
		const responseText = await Requests.send({
			url: `${this.SEARCH_URL}/${item.type}?query=${encodeURIComponent(item.title)}`,
			method: 'GET',
		});
		const searchItems = JSON.parse(responseText) as TraktSearchItem[];
		if (item.type === 'show') {
			searchItem = searchItems[0] as TraktSearchShowItem; //TODO can probably avoid assigning with clever generics
		} else {
			// Get the exact match if there are multiple movies with the same name by checking the year.
			searchItem = (searchItems as TraktSearchMovieItem[]).find(
				(x) => x.movie.title === item.title && x.movie.year === item.year
			);
		}
		if (!searchItem) {
			throw {
				request: { item },
				status: 404,
				text: responseText,
			};
		}
		return searchItem;
	}

	async findEpisode(item: Item): Promise<TraktSearchEpisodeItem> {
		let episodeItem: TraktEpisodeItem;
		const showItem = (await this.findItem(item)) as TraktSearchShowItem;
		const responseText = await Requests.send({
			url: this.getEpisodeUrl(item, showItem.show.ids.trakt),
			method: 'GET',
		});
		if (item.episode) {
			episodeItem = {
				episode: JSON.parse(responseText) as TraktEpisodeItemEpisode,
			};
		} else {
			const episodeItems = JSON.parse(responseText) as TraktSearchEpisodeItem[];
			episodeItem = this.findEpisodeByTitle(item, showItem, episodeItems);
		}
		return Object.assign({}, episodeItem, showItem);
	}

	findEpisodeByTitle(
		item: Item,
		showItem: TraktSearchShowItem,
		episodeItems: TraktSearchEpisodeItem[]
	): TraktEpisodeItem {
		const episodeItem: TraktEpisodeItemEpisode | undefined = episodeItems
			.map((x) => x.episode) //TODO figure out removed || x
			.find(
				(x) =>
					x.title &&
					item.episodeTitle &&
					this.formatEpisodeTitle(x.title) === this.formatEpisodeTitle(item.episodeTitle)
			);
		if (!episodeItem) {
			throw {
				request: { item, showItem },
				status: 404,
				text: 'Episode not found.',
			};
		}
		return { episode: episodeItem };
	}

	getEpisodeUrl(item: Item, traktId: number): string {
		let url = '';
		if (typeof item.season !== 'undefined' && typeof item.episode !== 'undefined') {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}/episodes/${item.episode}`;
		} else if (item.isCollection && item.episodeTitle) {
			url = `${this.SEARCH_URL}/episode?query=${encodeURIComponent(item.episodeTitle)}`;
		} else if (typeof item.season !== 'undefined') {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}`;
		}
		return url;
	}

	formatEpisodeTitle(title: string): string {
		return title
			.toLowerCase()
			.replace(/(^|\s)(a|an|the)(\s)/g, '$1$3')
			.replace(/\s/g, '');
	}
}

export const TraktSearch = new _TraktSearch();
