import { CacheValues } from '../common/Cache';
import { Errors } from '../common/Errors';
import { Messaging } from '../common/Messaging';
import { Requests } from '../common/Requests';
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
				movie: responseJson.images?.poster_sizes?.[2] ?? '',
				show: responseJson.images?.still_sizes?.[2] ?? '',
			},
		};
	};

	/**
	 * If the image for the item is not found, returns a placeholder image.
	 */
	findImage = async (item?: TraktItem | null): Promise<string> => {
		if (!this.config) {
			try {
				await this.activate();
			} catch (err) {
				Errors.warning('Failed to get TMDB config.', err);
				return this.PLACEHOLDER_IMAGE;
			}
		}
		if (!this.config || !item?.tmdbId) {
			return this.PLACEHOLDER_IMAGE;
		}
		const cache = (await Messaging.toBackground({
			action: 'get-cache',
			key: 'tmdbImages',
		})) as CacheValues['tmdbImages'];
		let imageUrl = cache[item.tmdbId.toString()];
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
					cache[item.tmdbId.toString()] = imageUrl;
					await Messaging.toBackground({
						action: 'set-cache',
						key: 'correctionSuggestions',
						value: cache,
					});
					return imageUrl;
				}
			}
		} catch (err) {
			Errors.warning('Failed to find item on TMDB.', err);
		}
		return this.PLACEHOLDER_IMAGE;
	};

	getItemUrl = (item: TraktItem): string => {
		let type = '';
		let path = '';
		if (item.type === 'show') {
			type = 'tv';
			path = `${item.tmdbId.toString()}/season/${item.season?.toString() ?? ''}/episode/${
				item.episode?.toString() ?? ''
			}`;
		} else {
			type = 'movie';
			path = item.tmdbId.toString() ?? '';
		}
		return `${this.API_URL}/${type}/${path}/images?api_key=${secrets.tmdbApiKey}`;
	};
}

export const TmdbApi = new _TmdbApi();
