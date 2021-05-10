import { CacheValues } from '../common/Cache';
import { Errors } from '../common/Errors';
import { Messaging } from '../common/Messaging';
import { RequestException, Requests } from '../common/Requests';
import { Item } from '../models/Item';
import { TraktItem } from '../models/TraktItem';
import { secrets } from '../secrets';

export interface TmdbConfigResponse {
	images?: {
		secure_base_url?: string;
		poster_sizes?: string[];
		still_sizes?: string[];
	};
}

export type TmdbImageResponse = TmdbMovieImageResponse | TmdbShowImageResponse;

export interface TmdbMovieImageResponse {
	posters: {
		file_path: string;
	}[];
}

export interface TmdbShowImageResponse {
	stills: {
		file_path: string;
	}[];
}

export interface TmdbErrorResponse {
	status_nessage: string;
	status_code: number;
}

export interface TmdbApiConfig {
	host: string;
	width: {
		movie: string;
		show: string;
	};
}

class _TmdbApi {
	API_VERSION = '3';
	API_URL = `https://api.themoviedb.org/${this.API_VERSION}`;
	CONFIGURATION_URL = `${this.API_URL}/configuration`;
	DATABASE_URL =
		'https://script.google.com/macros/s/AKfycbygXJgOdsu8leGxOyNUmrR3FMBsS561-OjJhSrNKzNMBhjQcJE/exec';
	PLACEHOLDER_IMAGE =
		'https://trakt.tv/assets/placeholders/thumb/poster-2d5709c1b640929ca1ab60137044b152.png';

	config: TmdbApiConfig | undefined;

	activate = async (): Promise<void> => {
		const responseText = await Requests.send({
			url: `${this.CONFIGURATION_URL}?api_key=${secrets.tmdbApiKey}`,
			method: 'GET',
		});
		const responseJson = JSON.parse(responseText) as TmdbConfigResponse;
		this.config = {
			host: responseJson.images?.secure_base_url ?? '',
			width: {
				movie: responseJson.images?.poster_sizes?.[3] ?? '',
				show: responseJson.images?.still_sizes?.[2] ?? '',
			},
		};
	};

	findImage = async (item?: TraktItem | null): Promise<string | null> => {
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
		const cache = (await Messaging.toBackground({
			action: 'get-cache',
			key: 'tmdbImages',
		})) as CacheValues['tmdbImages'];
		let imageUrl = cache[item.id.toString()];
		if (imageUrl) {
			return imageUrl;
		}
		try {
			const responseText = await Requests.send({
				url: this.getItemUrl(item),
				method: 'GET',
			});
			const responseJson = JSON.parse(responseText) as TmdbImageResponse | TmdbErrorResponse;
			if (!('status_code' in responseJson)) {
				const image = 'stills' in responseJson ? responseJson.stills[0] : responseJson.posters[0];
				if (image) {
					imageUrl = `${this.config.host}${this.config.width[item.type]}${image.file_path}`;
					cache[item.id.toString()] = imageUrl;
					await Messaging.toBackground({
						action: 'set-cache',
						key: 'correctionSuggestions',
						value: cache,
					});
					return imageUrl;
				}
			}
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.warning('Failed to find item on TMDB.', err);
			}
		}
		return null;
	};

	getItemUrl = (item: TraktItem): string => {
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
	};

	loadImages = async (items: Item[]): Promise<void> => {
		const missingItems = items.filter((item) => typeof item.imageUrl === 'undefined');
		if (missingItems.length === 0) {
			return;
		}
		if (
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return;
		}
		try {
			const cache = (await Messaging.toBackground({
				action: 'get-cache',
				key: 'tmdbImages',
			})) as CacheValues['tmdbImages'];
			const itemsToFetch = [];
			for (const item of missingItems) {
				if (!item.trakt) {
					continue;
				}
				const imageUrl = cache[item.trakt.id.toString()];
				if (imageUrl) {
					item.imageUrl = imageUrl;
				} else {
					itemsToFetch.push(item);
				}
			}
			if (itemsToFetch.length > 0) {
				let json;
				try {
					const response = await Requests.send({
						method: 'POST',
						url: this.DATABASE_URL,
						body: {
							items: itemsToFetch.map((item) => ({
								id: item.trakt?.id,
								tmdbId: item.trakt?.tmdbId,
								type: item.trakt?.type,
								season: item.trakt?.season,
								episode: item.trakt?.episode,
							})),
						},
					});
					json = JSON.parse(response) as Record<string, string | null>;
				} catch (err) {
					// Do nothing
				}
				for (const item of itemsToFetch) {
					if (!item.trakt) {
						continue;
					}
					const imageUrl = json ? json[item.trakt.id.toString()] : await this.findImage(item.trakt);
					if (imageUrl) {
						item.imageUrl = imageUrl;
						cache[item.trakt.id.toString()] = imageUrl;
					}
				}
				await Messaging.toBackground({
					action: 'set-cache',
					key: 'tmdbImages',
					value: cache,
				});
			}
		} catch (err) {
			// Do nothing
		}
		for (const item of missingItems) {
			item.imageUrl = item.imageUrl ?? this.PLACEHOLDER_IMAGE;
		}
	};

	loadItemImage = async (item: Item): Promise<Item> => {
		const itemCopy = new Item(item);
		if (
			!itemCopy.trakt ||
			!(await browser.permissions.contains({
				origins: ['*://script.google.com/*', '*://script.googleusercontent.com/*'],
			}))
		) {
			return itemCopy;
		}
		let imageUrl;
		try {
			const cache = (await Messaging.toBackground({
				action: 'get-cache',
				key: 'tmdbImages',
			})) as CacheValues['tmdbImages'];
			imageUrl = cache[itemCopy.trakt.id.toString()];
			if (!imageUrl) {
				let json;
				try {
					const response = await Requests.send({
						method: 'POST',
						url: this.DATABASE_URL,
						body: {
							items: [
								{
									id: itemCopy.trakt.id,
									tmdbId: itemCopy.trakt.tmdbId,
									type: itemCopy.trakt.type,
									season: itemCopy.trakt.season,
									episode: itemCopy.trakt.episode,
								},
							],
						},
					});
					json = JSON.parse(response) as Record<string, string | null>;
				} catch (err) {
					// Do nothing
				}
				imageUrl = json ? json[itemCopy.trakt.id.toString()] : await this.findImage(itemCopy.trakt);
				if (imageUrl) {
					cache[itemCopy.trakt.id.toString()] = imageUrl;
					await Messaging.toBackground({
						action: 'set-cache',
						key: 'correctionSuggestions',
						value: cache,
					});
				}
			}
		} catch (err) {
			// Do nothing
		}
		itemCopy.imageUrl = imageUrl ?? this.PLACEHOLDER_IMAGE;
		return itemCopy;
	};
}

export const TmdbApi = new _TmdbApi();
