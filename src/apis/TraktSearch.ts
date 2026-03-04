import { CorrectionApi } from '@apis/CorrectionApi';
import { TraktApi } from '@apis/TraktApi';
import { CacheItems } from '@common/Cache';
import { RequestError } from '@common/RequestError';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { EpisodeItem, isItem, Item, ScrobbleItem } from '@models/Item';
import {
	createTraktScrobbleItem,
	TraktEpisodeItem,
	TraktMovieItem,
	TraktScrobbleItem,
	TraktShowItemValues,
} from '@models/TraktItem';

export type TraktSearchItem = TraktSearchShowItem | TraktSearchMovieItem;

export type TraktSearchEpisodeItem = TraktSearchEpisodeItemEpisode & TraktSearchShowItem;

export interface TraktSearchEpisodeItemEpisode {
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
		item: ScrobbleItem,
		caches: CacheItems<['itemsToTraktItems', 'traktItems', 'urlsToTraktItems']>,
		exactItemDetails?: ExactItemDetails,
		cancelKey = 'default'
	): Promise<TraktScrobbleItem | null> {
		let traktItem: TraktScrobbleItem | null = null;
		const databaseId = item.getDatabaseId();
		let traktDatabaseId = exactItemDetails
			? 'id' in exactItemDetails
				? CorrectionApi.getSuggestionDatabaseId(exactItemDetails)
				: caches.urlsToTraktItems.get(exactItemDetails.url)
			: caches.itemsToTraktItems.get(databaseId);
		const cacheItem = traktDatabaseId ? caches.traktItems.get(traktDatabaseId) : null;
		if (cacheItem && cacheItem.type !== 'show') {
			traktItem = createTraktScrobbleItem(cacheItem);
			return traktItem;
		}
		try {
			let searchItem: TraktSearchEpisodeItem | TraktSearchMovieItem;
			if (exactItemDetails) {
				searchItem = await this.findExactItem(exactItemDetails, caches, cancelKey);
			} else if (item.type === 'episode') {
				searchItem = await this.findEpisode(item, caches, cancelKey);
			} else {
				searchItem = (await this.findItem(item, cancelKey)) as TraktSearchMovieItem;
			}
			if ('episode' in searchItem) {
				const { episode, show } = searchItem;
				const firstAired = episode.first_aired;
				const releaseDate = firstAired ? Utils.unix(firstAired) : undefined;
				traktItem = new TraktEpisodeItem({
					id: episode.ids.trakt,
					tmdbId: episode.ids.tmdb,
					title: episode.title,
					year: show.year,
					season: episode.season,
					number: episode.number,
					releaseDate,
					show: {
						id: show.ids.trakt,
						tmdbId: show.ids.tmdb,
						title: show.title,
						year: show.year,
					},
				});
			} else {
				const { movie } = searchItem;
				const released = movie.released;
				const releaseDate = released ? Utils.unix(released) : undefined;
				traktItem = new TraktMovieItem({
					id: movie.ids.trakt,
					tmdbId: movie.ids.tmdb,
					title: movie.title,
					year: movie.year,
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
				...traktItem.save(),
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
			if (!searchItem[0]) {
				throw new RequestError({
					status: 404,
					text: searchItemResponse,
				});
			}
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
					item: item.save(),
				},
			});
		}
		return searchItem;
	}

	async findShow(
		itemOrUrl: EpisodeItem | string,
		caches: CacheItems<['traktItems', 'urlsToTraktItems']>,
		cancelKey = 'default'
	): Promise<TraktSearchShowItem> {
		const showUrl = isItem(itemOrUrl)
			? `show?query=${encodeURIComponent(itemOrUrl.show.title)}`
			: itemOrUrl;
		let traktDatabaseId = caches.urlsToTraktItems.get(showUrl);
		let cacheItem = traktDatabaseId
			? (caches.traktItems.get(traktDatabaseId) as TraktShowItemValues | undefined)
			: null;
		if (!cacheItem) {
			let show;
			if (isItem(itemOrUrl)) {
				show = ((await this.findItem(itemOrUrl.show, cancelKey)) as TraktSearchShowItem).show;
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
		item: EpisodeItem,
		caches: CacheItems<['traktItems', 'urlsToTraktItems']>,
		cancelKey = 'default'
	): Promise<TraktSearchEpisodeItem> {
		const showItem = await this.findShow(item, caches, cancelKey);
		await this.activate();

		// Try with the provided season/episode numbers first
		let url = this.getEpisodeUrl(item, showItem.show.ids.trakt);
		let responseText: string | null = null;

		try {
			responseText = await this.requests.send({
				url: url,
				method: 'GET',
				cancelKey,
			});
		} catch (error) {
			// If provided numbers don't work, try TMDB fallback first
			if (
				Shared.errors.validate(error) &&
				((error as RequestError).status === 404 || (error as RequestError).status === -1) &&
				item.title &&
				!item.title.startsWith('Episode')
			) {
				const tmdbResult = await this.tryTmdbFallback(item, showItem, cancelKey);
				if (tmdbResult) {
					return this.parseEpisodeResponse(tmdbResult, item, showItem);
				}

				// If TMDB also fails, try treating numbers as absolute
				const { foundSeason, foundEpisodeNumber } = await this.tryAbsoluteEpisodeNumberFallback(
					item,
					showItem,
					cancelKey
				);

				if (foundSeason !== null) {
					const absoluteUrl = this.buildEpisodeUrl(item, showItem, foundSeason, foundEpisodeNumber);
					try {
						responseText = await this.requests.send({
							url: absoluteUrl,
							method: 'GET',
							cancelKey,
						});
					} catch (_absoluteError) {
						throw error; // Throw original error if absolute fallback also fails
					}
				} else {
					throw error;
				}
			} else {
				throw error;
			}
		}

		return this.parseEpisodeResponse(responseText, item, showItem);
	}

	private async tryAbsoluteEpisodeNumberFallback(
		item: EpisodeItem,
		showItem: TraktSearchShowItem,
		cancelKey: string
	): Promise<{ foundSeason: number | null; foundEpisodeNumber: number }> {
		let foundSeason: number | null = null;
		let foundEpisodeNumber = 0;

		if (!item.number) {
			return { foundSeason, foundEpisodeNumber };
		}

		const seasons = await this.fetchSeasons(showItem, cancelKey);

		// Try to treat provided numbers as absolute (e.g., anime episodes from Crunchyroll)
		const result = this.calculateAbsoluteEpisodePosition(item, seasons);
		foundSeason = result.season;
		foundEpisodeNumber = result.episode;

		return { foundSeason, foundEpisodeNumber };
	}

	private async fetchSeasons(
		showItem: TraktSearchShowItem,
		cancelKey: string
	): Promise<{ number: number; episode_count: number }[]> {
		const seasonsResponse = await this.requests.send({
			url: `${this.API_URL}/shows/${showItem.show.ids.trakt}/seasons?extended=full`,
			method: 'GET',
			cancelKey,
		});
		return (
			JSON.parse(seasonsResponse) as {
				number: number;
				episode_count: number;
			}[]
		).filter((s) => s.number > 0); // Filter out specials (season 0)
	}

	private calculateAbsoluteEpisodePosition(
		item: EpisodeItem,
		seasons: { number: number; episode_count: number }[]
	): { season: number; episode: number } {
		const maxSeason = seasons.length > 0 ? seasons[seasons.length - 1].number : 0;

		// Heuristic: If the episode number is small (e.g. <= 25) and the season is > max known season,
		// it's likely a new season that Trakt doesn't have yet.
		// In this case, absolute calculation would erroneously map it to Season 1.
		if (item.number && item.number <= 25 && item.season && item.season > maxSeason) {
			return { season: item.season, episode: item.number };
		}

		let absoluteCount = 0;
		seasons.sort((a, b) => a.number - b.number);
		for (const season of seasons) {
			if (item.number && item.number <= absoluteCount + season.episode_count) {
				return {
					season: season.number,
					episode: item.number - absoluteCount,
				};
			}
			absoluteCount += season.episode_count;
		}

		// Fallback: Use the original provided season and number if absolute calc failed
		return { season: item.season || 0, episode: item.number || 0 };
	}

	private buildEpisodeUrl(
		item: EpisodeItem,
		showItem: TraktSearchShowItem,
		foundSeason: number | null,
		foundEpisodeNumber: number
	): string {
		if (foundSeason !== null) {
			const tempItem = item.clone();
			tempItem.season = foundSeason;
			tempItem.number = foundEpisodeNumber;
			return this.getEpisodeUrl(tempItem, showItem.show.ids.trakt);
		}
		return this.getEpisodeUrl(item, showItem.show.ids.trakt);
	}

	private async tryTmdbFallback(
		item: EpisodeItem,
		showItem: TraktSearchShowItem,
		cancelKey: string
	): Promise<string | null> {
		try {
			const { TmdbApi } = await import('@apis/TmdbApi');
			const tmdbShow = await TmdbApi.searchTvShow(item.show.title, item.show.year, item.serviceId);

			if (!tmdbShow) {
				return null;
			}

			const tmdbEpisode = await TmdbApi.findEpisodeByTitle(tmdbShow.id, item.title);

			if (!tmdbEpisode) {
				return null;
			}

			const tmdbBasedUrl = `${this.SHOWS_URL}/${showItem.show.ids.trakt}/seasons/${tmdbEpisode.season}/episodes/${tmdbEpisode.episode}?extended=full`;
			return await this.requests.send({
				url: tmdbBasedUrl,
				method: 'GET',
				cancelKey,
			});
		} catch (_tmdbError) {
			return null;
		}
	}

	private parseEpisodeResponse(
		responseText: string,
		item: EpisodeItem,
		showItem: TraktSearchShowItem
	): TraktSearchEpisodeItem {
		const response = JSON.parse(responseText) as TraktEpisodeItemEpisode | TraktSearchEpisodeItem[];

		if (Array.isArray(response)) {
			return this.findEpisodeByTitle(item, showItem, response);
		}

		return {
			episode: response,
			show: showItem.show,
		};
	}

	findEpisodeByTitle(
		item: EpisodeItem,
		showItem: TraktSearchShowItem,
		episodeItems: TraktSearchEpisodeItem[]
	): TraktSearchEpisodeItem {
		let searchItem = episodeItems.find(
			(x) =>
				x.episode.title &&
				item.title &&
				(this.formatEpisodeTitle(x.episode.title) === this.formatEpisodeTitle(item.title) ||
					/^Episode \d+$/.test(x.episode.title)) &&
				(this.formatEpisodeTitle(x.show.title).includes(this.formatEpisodeTitle(item.show.title)) ||
					this.formatEpisodeTitle(item.title).includes(this.formatEpisodeTitle(x.show.title)))
		);
		if (!searchItem && episodeItems.length > 0) {
			searchItem = episodeItems[0];
		}
		if (!searchItem) {
			throw new RequestError({
				status: 404,
				text: 'Episode not found.',
				extra: {
					item: item.save(),
					showItem,
				},
			});
		}
		return searchItem;
	}

	getEpisodeUrl(item: EpisodeItem, traktId: number): string {
		let url = '';
		if (item.season && item.number) {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}/episodes/${item.number}?extended=full`;
		} else if (item.title) {
			url = `${this.SEARCH_URL}/episode?query=${encodeURIComponent(item.title)}&extended=full`;
		} else if (item.season) {
			url = `${this.SHOWS_URL}/${traktId}/seasons/${item.season}?extended=full`;
		}
		return url;
	}

	formatEpisodeTitle(title: string): string {
		return title
			.toLowerCase()
			.replace(/(?<begin>^|\s)(?:a|an|the)(?<end>\s)/g, '$<begin>$<end>')
			.replace(/[^\w]/g, '');
	}
}

export const TraktSearch = new _TraktSearch();
