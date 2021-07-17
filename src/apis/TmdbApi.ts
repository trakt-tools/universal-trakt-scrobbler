import { secrets } from '@/secrets';
import { Errors } from '@common/Errors';
import { Messaging } from '@common/Messaging';
import { RequestException, Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';

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

export interface TmdbApiConfig {
	baseUrl: string;
	sizes: {
		show: string;
		movie: string;
	};
}

class _TmdbApi {
	readonly API_VERSION = '3';
	readonly API_URL = `https://api.themoviedb.org/${this.API_VERSION}`;
	readonly CONFIGURATION_URL = `${this.API_URL}/configuration`;
	readonly DATABASE_URL = `${Shared.DATABASE_URL}/tmdb`;
	readonly IMAGES_DATABASE_URL = `${this.DATABASE_URL}/images`;
	readonly PLACEHOLDER_IMAGE =
		'https://trakt.tv/assets/placeholders/thumb/poster-2d5709c1b640929ca1ab60137044b152.png';

	private config: TmdbApiConfig | undefined;

	private async activate(): Promise<void> {
		const responseText = await Requests.send({
			url: `${this.CONFIGURATION_URL}?api_key=${secrets.tmdbApiKey}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as TmdbConfigResponse;
		this.config = {
			baseUrl: responseJson.images?.secure_base_url ?? '',
			sizes: {
				show: responseJson.images?.still_sizes?.[2] ?? '',
				movie: responseJson.images?.poster_sizes?.[3] ?? '',
			},
		};
	}

	private async findImage(item?: TraktItem | null): Promise<string | null> {
		if (!this.config) {
			try {
				await this.activate();
			} catch (err) {
				if (!(err as RequestException).canceled) {
					Errors.warning('Failed to get TMDB config.', err);
				}
				return null;
			}
		}
		if (!this.config || !item?.tmdbId) {
			return null;
		}
		const cache = await Messaging.toBackground({
			action: 'get-cache',
			key: 'imageUrls',
		});
		const databaseId = item.getDatabaseId();
		let imageUrl = cache[databaseId];
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
				cache[databaseId] = imageUrl;
				await Messaging.toBackground({
					action: 'set-cache',
					key: 'imageUrls',
					value: cache,
				});
				return imageUrl;
			}
		} catch (err) {
			if (!(err as RequestException).canceled) {
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
		return `${this.API_URL}/${type}/${path}/images?api_key=${secrets.tmdbApiKey}`;
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
		const cache = await Messaging.toBackground({
			action: 'get-cache',
			key: 'imageUrls',
		});
		try {
			const itemsToFetch: Item[] = [];
			for (const item of newItems) {
				if (!item.trakt || typeof item.imageUrl !== 'undefined') {
					continue;
				}
				const databaseId = item.trakt.getDatabaseId();
				const imageUrl = cache[databaseId];
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
			cache[databaseId] = item.imageUrl;
		}
		await Messaging.toBackground({
			action: 'set-cache',
			key: 'imageUrls',
			value: cache,
		});
		return newItems;
	}
}

export const TmdbApi = new _TmdbApi();
