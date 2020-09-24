import { CorrectItem } from '../common/BrowserStorage';
import { EventDispatcher } from '../common/Events';
import { Requests } from '../common/Requests';
import { Item } from '../models/Item';
import { TraktItem } from '../models/TraktItem';
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
		tmdb: number;
	};
	first_aired: string | null;
}

export interface TraktSearchShowItem {
	show: TraktSearchShowItemShow;
}

export interface TraktSearchShowItemShow {
	title: string;
	year: number;
	ids: {
		trakt: number;
		tmdb: number;
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
		tmdb: number;
	};
	released: string;
}

class _TraktSearch extends TraktApi {
	constructor() {
		super();
	}

	find = async (item: Item, correctItem?: CorrectItem): Promise<TraktItem | undefined> => {
		let traktItem: TraktItem | undefined;
		try {
			let searchItem: TraktSearchEpisodeItem | TraktSearchMovieItem;
			if (correctItem) {
				searchItem = await this.findItemFromIdOrUrl(correctItem);
			} else if (item.type === 'show') {
				searchItem = await this.findEpisode(item);
			} else {
				searchItem = (await this.findItem(item)) as TraktSearchMovieItem;
			}
			if ('episode' in searchItem) {
				const id = searchItem.episode.ids.trakt;
				const tmdbId = searchItem.show.ids.tmdb;
				const title = searchItem.show.title;
				const year = searchItem.show.year;
				const season = searchItem.episode.season;
				const episode = searchItem.episode.number;
				const episodeTitle = searchItem.episode.title;
				const releaseDate = searchItem.episode.first_aired;
				traktItem = new TraktItem({
					id,
					tmdbId,
					type: 'show',
					title,
					year,
					season,
					episode,
					episodeTitle,
					releaseDate,
				});
			} else {
				const id = searchItem.movie.ids.trakt;
				const tmdbId = searchItem.movie.ids.tmdb;
				const title = searchItem.movie.title;
				const year = searchItem.movie.year;
				const releaseDate = searchItem.movie.released;
				traktItem = new TraktItem({
					id,
					tmdbId,
					type: 'movie',
					title,
					year,
					releaseDate,
				});
			}
			await EventDispatcher.dispatch('SEARCH_SUCCESS', null, { searchItem });
		} catch (err) {
			await EventDispatcher.dispatch('SEARCH_ERROR', null, { error: err as Error });
			throw err;
		}
		return traktItem;
	};

	findItemFromIdOrUrl = async (
		correctItem: CorrectItem
	): Promise<TraktSearchEpisodeItem | TraktSearchMovieItem> => {
		const url = correctItem.traktId
			? `/search/trakt/${correctItem.traktId}?type=${correctItem.type}&extended=full`
			: `${correctItem.url}?extended=full`;
		const searchItemResponse = await Requests.send({
			url: `${this.API_URL}${url}`,
			method: 'GET',
		});
		const searchItem = JSON.parse(searchItemResponse) as
			| TraktSearchEpisodeItem[]
			| TraktEpisodeItemEpisode
			| TraktSearchMovieItemMovie;
		if (Array.isArray(searchItem)) {
			return searchItem[0];
		} else if ('season' in searchItem) {
			const showResponse = await Requests.send({
				url: `${this.API_URL}${url.replace(/\/seasons\/.*/, '')}`,
				method: 'GET',
			});
			const show = JSON.parse(showResponse) as TraktSearchShowItemShow;
			return { episode: searchItem, show };
		} else {
			return { movie: searchItem };
		}
	};

	findItem = async (item: Item): Promise<TraktSearchItem> => {
		let searchItem: TraktSearchItem | undefined;
		const responseText = await Requests.send({
			url: `${this.SEARCH_URL}/${item.type}?query=${encodeURIComponent(item.title)}&extended=full`,
			method: 'GET',
		});
		const searchItems = JSON.parse(responseText) as TraktSearchItem[];
		if (item.type === 'show') {
			searchItem = searchItems[0] as TraktSearchShowItem; //TODO can probably avoid assigning with clever generics
		} else {
			// Get the exact match if there are multiple movies with the same name by checking the year.
			searchItem = (searchItems as TraktSearchMovieItem[]).find(
				(x) =>
					x.movie.title.toLowerCase() === item.title.toLowerCase() && x.movie.year === item.year
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
	};

	findEpisode = async (item: Item): Promise<TraktSearchEpisodeItem> => {
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
	};

	findEpisodeByTitle = (
		item: Item,
		showItem: TraktSearchShowItem,
		episodeItems: TraktSearchEpisodeItem[]
	): TraktEpisodeItem => {
		const searchItem = episodeItems.find(
			(x) =>
				x.episode.title &&
				item.episodeTitle &&
				this.formatEpisodeTitle(x.episode.title) === this.formatEpisodeTitle(item.episodeTitle) &&
				this.formatEpisodeTitle(x.show.title) === this.formatEpisodeTitle(item.title)
		);
		if (!searchItem) {
			throw {
				request: { item, showItem },
				status: 404,
				text: 'Episode not found.',
			};
		}
		return { episode: searchItem.episode };
	};

	getEpisodeUrl = (item: Item, traktId: number): string => {
		let url = '';
		if (typeof item.season !== 'undefined' && typeof item.episode !== 'undefined') {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}/episodes/${item.episode}?extended=full`;
		} else if (item.isCollection && item.episodeTitle) {
			url = `${this.SEARCH_URL}/episode?query=${encodeURIComponent(
				item.episodeTitle
			)}&extended=full`;
		} else if (typeof item.season !== 'undefined') {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}?extended=full`;
		}
		return url;
	};

	formatEpisodeTitle = (title: string): string => {
		return title
			.toLowerCase()
			.replace(/(^|\s)(a|an|the)(\s)/g, '$1$3')
			.replace(/\s/g, '');
	};
}

export const TraktSearch = new _TraktSearch();
