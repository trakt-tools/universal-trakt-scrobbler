import { CorrectionApi } from '@apis/CorrectionApi';
import { TraktApi } from '@apis/TraktApi';
import { CacheItems } from '@common/Cache';
import { RequestError } from '@common/RequestError';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';

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
	/** Format: yyyy-MM-ddTHH:mm:ss.SSSZ */
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
	/** Format: yyyy-MM-dd */
	released: string;
}

export type ExactItemDetails =
	| {
			type: 'episode' | 'movie';
			id: number;
	  }
	| {
			url: string;
	  };

class _TraktSearch extends TraktApi {
	constructor() {
		super();
	}

	async find(
		item: Item,
		caches: CacheItems<['itemsToTraktItems', 'traktItems', 'urlsToTraktItems']>,
		exactItemDetails?: ExactItemDetails,
		cancelKey = 'default'
	): Promise<TraktItem | null> {
		let traktItem: TraktItem | null = null;
		const databaseId = item.getDatabaseId();
		let traktDatabaseId = exactItemDetails
			? 'id' in exactItemDetails
				? CorrectionApi.getSuggestionDatabaseId(exactItemDetails)
				: caches.urlsToTraktItems.get(exactItemDetails.url)
			: caches.itemsToTraktItems.get(databaseId);
		const cacheItem = traktDatabaseId ? caches.traktItems.get(traktDatabaseId) : null;
		if (cacheItem) {
			traktItem = TraktItem.load(cacheItem);
			return traktItem;
		}
		try {
			let searchItem: TraktSearchEpisodeItem | TraktSearchMovieItem;
			if (exactItemDetails) {
				searchItem = await this.findExactItem(exactItemDetails, caches, cancelKey);
			} else if (item.type === 'show') {
				searchItem = await this.findEpisode(item, caches, cancelKey);
			} else {
				searchItem = (await this.findItem(item, cancelKey)) as TraktSearchMovieItem;
			}
			if ('episode' in searchItem) {
				const id = searchItem.episode.ids.trakt;
				const tmdbId = searchItem.show.ids.tmdb;
				const title = searchItem.show.title;
				const year = searchItem.show.year;
				const season = searchItem.episode.season;
				const episode = searchItem.episode.number;
				const episodeTitle = searchItem.episode.title;
				const firstAired = searchItem.episode.first_aired;
				const releaseDate = firstAired ? Utils.unix(firstAired) : undefined;
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
				const released = searchItem.movie.released;
				const releaseDate = released ? Utils.unix(released) : undefined;
				traktItem = new TraktItem({
					id,
					tmdbId,
					type: 'movie',
					title,
					year,
					releaseDate,
				});
			}
			if (Shared.pageType === 'content') {
				await Shared.events.dispatch('SEARCH_SUCCESS', null, { searchItem });
			}
		} catch (err) {
			if (Shared.pageType === 'content' && Shared.errors.validate(err)) {
				await Shared.events.dispatch('SEARCH_ERROR', null, { error: err });
			}
			throw err;
		}
		if (traktItem) {
			traktDatabaseId = traktItem.getDatabaseId();
			caches.itemsToTraktItems.set(databaseId, traktDatabaseId);
			caches.traktItems.set(traktDatabaseId, {
				...TraktItem.save(traktItem),
				syncId: undefined,
				watchedAt: undefined,
			});
			if (exactItemDetails && 'url' in exactItemDetails) {
				caches.urlsToTraktItems.set(exactItemDetails.url, traktDatabaseId);
			}
		}
		return traktItem;
	}

	async findExactItem(
		details: ExactItemDetails,
		caches: CacheItems<['traktItems', 'urlsToTraktItems']>,
		cancelKey = 'default'
	): Promise<TraktSearchEpisodeItem | TraktSearchMovieItem> {
		const url =
			'id' in details
				? `/search/trakt/${details.id.toString()}?type=${details.type}&extended=full`
				: `${details.url}?extended=full`;
		await this.activate();
		const searchItemResponse = await this.requests.send({
			url: `${this.API_URL}${url}`,
			method: 'GET',
			cancelKey,
		});
		const searchItem = JSON.parse(searchItemResponse) as
			| TraktSearchEpisodeItem[]
			| TraktEpisodeItemEpisode
			| TraktSearchMovieItemMovie;
		if (Array.isArray(searchItem)) {
			return searchItem[0];
		} else if ('season' in searchItem) {
			const showUrl = url.replace(/\/seasons\/.*/, '');
			const show = await this.findShow(showUrl, caches, cancelKey);
			return { episode: searchItem, show: show.show };
		} else {
			return { movie: searchItem };
		}
	}

	async findItem(item: Item, cancelKey = 'default'): Promise<TraktSearchItem> {
		let searchItem: TraktSearchItem | undefined;
		await this.activate();
		const responseText = await this.requests.send({
			url: `${this.SEARCH_URL}/${item.type}?query=${encodeURIComponent(item.title)}&extended=full`,
			method: 'GET',
			cancelKey,
		});
		const searchItems = JSON.parse(responseText) as TraktSearchItem[];
		if (searchItems.length === 1) {
			// If there is only one search result, use it
			searchItem = searchItems[0];
		} else {
			// Try to match by name and year, or just name if year isn't available
			const itemTitle = item.title.toLowerCase();
			const itemYear = item.year;
			searchItem = searchItems.find((currentSearchItem) => {
				const info = 'show' in currentSearchItem ? currentSearchItem.show : currentSearchItem.movie;
				const title = info.title.toLowerCase();
				const year = info.year;

				return title === itemTitle && (!itemYear || !year || itemYear === year);
			});
			if (!searchItem) {
				// Couldn't match, so just use the first result
				searchItem = searchItems[0];
			}
		}
		if (!searchItem) {
			throw new RequestError({
				status: 404,
				text: responseText,
				extra: {
					item: Item.save(item),
				},
			});
		}
		return searchItem;
	}

	async findShow(
		itemOrUrl: Item | string,
		caches: CacheItems<['traktItems', 'urlsToTraktItems']>,
		cancelKey = 'default'
	): Promise<TraktSearchShowItem> {
		const showUrl =
			itemOrUrl instanceof Item
				? `${itemOrUrl.type}?query=${encodeURIComponent(itemOrUrl.title)}`
				: itemOrUrl;
		let traktDatabaseId = caches.urlsToTraktItems.get(showUrl);
		let cacheItem = traktDatabaseId ? caches.traktItems.get(traktDatabaseId) : null;
		if (!cacheItem) {
			let show;
			if (itemOrUrl instanceof Item) {
				show = ((await this.findItem(itemOrUrl, cancelKey)) as TraktSearchShowItem).show;
			} else {
				await this.activate();
				const showResponse = await this.requests.send({
					url: `${this.API_URL}${showUrl}`,
					method: 'GET',
					cancelKey,
				});
				show = JSON.parse(showResponse) as TraktSearchShowItemShow;
			}
			cacheItem = {
				type: 'show',
				id: show.ids.trakt,
				tmdbId: show.ids.tmdb,
				title: show.title,
				year: show.year,
			};
			traktDatabaseId = `show_${cacheItem.id.toString()}`;
			caches.traktItems.set(traktDatabaseId, cacheItem);
			caches.urlsToTraktItems.set(showUrl, traktDatabaseId);
		}
		return {
			show: {
				ids: {
					trakt: cacheItem.id,
					tmdb: cacheItem.tmdbId,
				},
				title: cacheItem.title,
				year: cacheItem.year,
			},
		};
	}

	async findEpisode(
		item: Item,
		caches: CacheItems<['traktItems', 'urlsToTraktItems']>,
		cancelKey = 'default'
	): Promise<TraktSearchEpisodeItem> {
		let episodeItem: TraktEpisodeItem;
		const showItem = await this.findShow(item, caches, cancelKey);
		await this.activate();
		const responseText = await this.requests.send({
			url: this.getEpisodeUrl(item, showItem.show.ids.trakt),
			method: 'GET',
			cancelKey,
		});
		if (item.episode) {
			episodeItem = {
				episode: JSON.parse(responseText) as TraktEpisodeItemEpisode,
			};
			return Object.assign({}, episodeItem, showItem);
		} else {
			const episodeItems = JSON.parse(responseText) as TraktSearchEpisodeItem[];
			return this.findEpisodeByTitle(item, showItem, episodeItems);
		}
	}

	findEpisodeByTitle(
		item: Item,
		showItem: TraktSearchShowItem,
		episodeItems: TraktSearchEpisodeItem[]
	): TraktSearchEpisodeItem {
		const searchItem = episodeItems.find(
			(x) =>
				x.episode.title &&
				item.episodeTitle &&
				this.formatEpisodeTitle(x.episode.title) === this.formatEpisodeTitle(item.episodeTitle) &&
				(this.formatEpisodeTitle(x.show.title).includes(this.formatEpisodeTitle(item.title)) ||
					this.formatEpisodeTitle(item.title).includes(this.formatEpisodeTitle(x.show.title)))
		);
		if (!searchItem) {
			throw new RequestError({
				status: 404,
				text: 'Episode not found.',
				extra: {
					item: Item.save(item),
					showItem,
				},
			});
		}
		return searchItem;
	}

	getEpisodeUrl(item: Item, traktId: number): string {
		let url = '';
		if (typeof item.season !== 'undefined' && typeof item.episode !== 'undefined') {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}/episodes/${item.episode}?extended=full`;
		} else if (item.episodeTitle) {
			url = `${this.SEARCH_URL}/episode?query=${encodeURIComponent(
				item.episodeTitle
			)}&extended=full`;
		} else if (typeof item.season !== 'undefined') {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}?extended=full`;
		}
		return url;
	}

	formatEpisodeTitle(title: string): string {
		return title
			.toLowerCase()
			.replace(/(?<begin>^|\s)(?:a|an|the)(?<end>\s)/g, '$<begin>$<end>')
			.replace(/\s/g, '');
	}
}

export const TraktSearch = new _TraktSearch();
