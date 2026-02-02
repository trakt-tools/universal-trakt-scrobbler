import { Cache } from '@common/Cache';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { ScrobbleItem } from '@models/Item';
import { TraktItem } from '@models/TraktItem';

export interface TmdbApiConfig {
	baseUrl: string;
	sizes: {
		episode: string;
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
			const episodeSize = images?.still_sizes?.[2]; // This should be 300px
			const movieSize = images?.poster_sizes?.[3]; // This should be 342px (closest to 300px)
			if (!baseUrl || !episodeSize || !movieSize) {
				throw new Error('Missing config');
			}
			this.config = {
				baseUrl,
				sizes: {
					episode: episodeSize,
					show: movieSize,
					movie: movieSize,
				},
			};
			cache.set('default', this.config);
			await Cache.set({ tmdbApiConfigs: cache });
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.warning('Failed to get TMDB config.', err);
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
		const cache = await Cache.get('tmdbImageUrls');
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
				await Cache.set({ tmdbImageUrls: cache });
				return imageUrl;
			}
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.warning('Failed to find item on TMDB.', err);
			}
		}
		return null;
	}

	private getItemUrl(item: TraktItem): string {
		let type = '';
		let path = '';
		switch (item.type) {
			case 'episode':
				type = 'tv';
				path =
					item.season && item.number
						? `${item.show.tmdbId.toString()}/season/${item.season.toString()}/episode/${item.number.toString()}`
						: item.show.tmdbId.toString();
				break;

			case 'show':
				type = 'tv';
				path = item.tmdbId.toString();
				break;

			case 'movie':
				type = 'movie';
				path = item.tmdbId.toString();
				break;
		}
		return `${this.API_URL}/${type}/${path}/images?api_key=${Shared.tmdbApiKey}`;
	}

	/**
	 * Loads images for items from the database.
	 *
	 * If all images have already been loaded, returns the same parameter array, otherwise returns a new array for immutability.
	 */
	async loadImages(items: ScrobbleItem[]): Promise<ScrobbleItem[]> {
		const hasLoadedImages = !items.some((item) => typeof item.trakt?.imageUrl === 'undefined');
		if (hasLoadedImages) {
			return items;
		}
		const newItems = items.map((item) => item.clone());
		const cache = await Cache.get('tmdbImageUrls');
		try {
			const itemsToFetch: ScrobbleItem[] = [];
			for (const item of newItems) {
				if (!item.trakt || typeof item.trakt.imageUrl !== 'undefined') {
					continue;
				}
				const databaseId = item.trakt.getDatabaseId();
				const imageUrl = cache.get(databaseId);
				if (typeof imageUrl !== 'undefined') {
					item.trakt.imageUrl = imageUrl;
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
								type: item.trakt?.type,
								id: item.trakt?.id,
								tmdbId: item.trakt?.tmdbId,
								...(item.trakt?.type === 'episode'
									? {
											season: item.trakt?.season,
											episode: item.trakt?.number,
										}
									: {}),
							})),
						},
					});
					json = JSON.parse(response) as ImagesDatabaseResponse;
				} catch (_err) {
					// Do nothing
				}
				for (const item of itemsToFetch) {
					if (!item.trakt) {
						continue;
					}
					const databaseId = item.trakt.getDatabaseId();
					item.trakt.imageUrl = json?.result[databaseId] || (await this.findImage(item.trakt));
				}
			}
		} catch (_err) {
			// Do nothing
		}
		// Set all undefined images to `null` so that we don't try to load them again
		for (const item of newItems) {
			if (!item.trakt) {
				continue;
			}
			const databaseId = item.trakt.getDatabaseId();
			item.trakt.imageUrl = item.trakt.imageUrl || null;
			cache.set(databaseId, item.trakt.imageUrl);
		}
		await Cache.set({ tmdbImageUrls: cache });
		return newItems;
	}
}

export const TmdbApi = new _TmdbApi();
