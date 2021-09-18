import { Cache } from '@common/Cache';
import { Errors } from '@common/Errors';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';

export interface TmdbApiConfig {
	baseUrl: string;
	sizes: {
		show: string;
		movie: string;
	};
}

export interface TmdbConfigResponse {
	images?: {
		secure_base_url?: string;
		poster_sizes?: string[];
		still_sizes?: string[];
	};
}

export interface TmdbImageResponse {
	posters?: {
		file_path?: string;
	}[];
	stills?: {
		file_path?: string;
	}[];
}

export interface ImagesDatabaseResponse {
	result: Partial<Record<string, string>>;
}

/**
 * @see https://developers.themoviedb.org/3/getting-started/introduction
 */
class _TmdbApi {
	readonly API_VERSION = '3';
	readonly API_URL = `https://api.themoviedb.org/${this.API_VERSION}`;
	readonly CONFIGURATION_URL = `${this.API_URL}/configuration`;
	readonly DATABASE_URL = `${Shared.DATABASE_URL}/tmdb`;
	readonly IMAGES_DATABASE_URL = `${this.DATABASE_URL}/images`;

	private config?: TmdbApiConfig | null;

	private async activate(): Promise<void> {
		const cache = await Cache.get('tmdbApiConfigs');
		const config = cache.get('default');
		if (typeof config !== 'undefined') {
			this.config = config;
			return;
		}
		try {
			const responseText = await Requests.send({
				url: `${this.CONFIGURATION_URL}?api_key=${Shared.tmdbApiKey}`,
				method: 'GET',
			});
			const responseJson = JSON.parse(responseText) as TmdbConfigResponse;
			const { images } = responseJson;
			const baseUrl = images?.secure_base_url;
			const showSize = images?.still_sizes?.[2]; // This should be 300px
			const movieSize = images?.poster_sizes?.[3]; // This should be 342px (closest to 300px)
			if (!baseUrl || !showSize || !movieSize) {
				throw new Error('Missing config');
			}
			this.config = {
				baseUrl,
				sizes: {
					show: showSize,
					movie: movieSize,
				},
			};
			cache.set('default', this.config);
			await Cache.set({ tmdbApiConfigs: cache });
		} catch (err) {
			if (Errors.validate(err)) {
				Errors.warning('Failed to get TMDB config.', err);
			}
			this.config = null;
		}
	}

	private async findImage(item?: TraktItem | null): Promise<string | null> {
		if (typeof this.config === 'undefined') {
			await this.activate();
		}
		if (!this.config || !item?.tmdbId) {
			return null;
		}
		const cache = await Cache.get('imageUrls');
		const databaseId = item.getDatabaseId();
		let imageUrl = cache.get(databaseId);
		if (typeof imageUrl !== 'undefined') {
			return imageUrl;
		}
		try {
			const responseText = await Requests.send({
				url: this.getItemUrl(item),
				method: 'GET',
			});
			const responseJson = JSON.parse(responseText) as TmdbImageResponse;
			const image = responseJson?.stills?.[0] || responseJson?.posters?.[0];
			if (image?.file_path) {
				imageUrl = `${this.config.baseUrl}${this.config.sizes[item.type]}${image.file_path}`;
				cache.set(databaseId, imageUrl);
				await Cache.set({ imageUrls: cache });
				return imageUrl;
			}
		} catch (err) {
			if (Errors.validate(err)) {
				Errors.warning('Failed to find item on TMDB.', err);
			}
		}
		return null;
	}

	private getItemUrl(item: TraktItem): string {
		let type = '';
		let path = '';
		if (item.type === 'show') {
			type = 'tv';
			path =
				item.season && item.episode
					? `${item.tmdbId.toString()}/season/${item.season.toString()}/episode/${item.episode.toString()}`
					: item.tmdbId.toString();
		} else {
			type = 'movie';
			path = item.tmdbId.toString();
		}
		return `${this.API_URL}/${type}/${path}/images?api_key=${Shared.tmdbApiKey}`;
	}

	/**
	 * Loads images for items from the database.
	 *
	 * If all images have already been loaded, returns the same parameter array, otherwise returns a new array for immutability.
	 */
	async loadImages(items: Item[]): Promise<Item[]> {
		const hasLoadedImages = !items.some((item) => typeof item.imageUrl === 'undefined');
		if (hasLoadedImages) {
			return items;
		}
		const newItems = items.map((item) => item.clone());
		const cache = await Cache.get('imageUrls');
		try {
			const itemsToFetch: Item[] = [];
			for (const item of newItems) {
				if (!item.trakt || typeof item.imageUrl !== 'undefined') {
					continue;
				}
				const databaseId = item.trakt.getDatabaseId();
				const imageUrl = cache.get(databaseId);
				if (typeof imageUrl !== 'undefined') {
					item.imageUrl = imageUrl;
				} else {
					itemsToFetch.push(item);
				}
			}
			if (itemsToFetch.length > 0) {
				let json;
				try {
					const response = await Requests.send({
						method: 'PUT',
						url: this.IMAGES_DATABASE_URL,
						body: {
							items: itemsToFetch.map((item) => ({
								type: item.trakt?.type === 'show' ? 'episode' : 'movie',
								id: item.trakt?.id,
								tmdbId: item.trakt?.tmdbId,
								season: item.trakt?.season,
								episode: item.trakt?.episode,
							})),
						},
					});
					json = JSON.parse(response) as ImagesDatabaseResponse;
				} catch (err) {
					// Do nothing
				}
				for (const item of itemsToFetch) {
					if (!item.trakt) {
						continue;
					}
					const databaseId = item.trakt.getDatabaseId();
					item.imageUrl = json?.result[databaseId] || (await this.findImage(item.trakt));
				}
			}
		} catch (err) {
			// Do nothing
		}
		// Set all undefined images to `null` so that we don't try to load them again
		for (const item of newItems) {
			if (!item.trakt) {
				continue;
			}
			const databaseId = item.trakt.getDatabaseId();
			item.imageUrl = item.imageUrl || null;
			cache.set(databaseId, item.imageUrl);
		}
		await Cache.set({ imageUrls: cache });
		return newItems;
	}
}

export const TmdbApi = new _TmdbApi();
