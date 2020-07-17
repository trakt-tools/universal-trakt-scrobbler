import { Box } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { TraktItem } from '../../../models/TraktItem';
import { secrets } from '../../../secrets';
import { Errors } from '../../../services/Errors';
import { Requests } from '../../../services/Requests';

interface IPopupTmdbImage {
	item: TraktItem;
}

export interface TmdbConfigResponse {
	images?: {
		secure_base_url?: string;
		poster_sizes?: string[];
		still_sizes?: string[];
	};
}

export type TmdbImageResponse = TmdbShowImageResponse | TmdbMovieImageResponse;

export interface TmdbShowImageResponse {
	stills: {
		file_path: string;
	}[];
}

export interface TmdbMovieImageResponse {
	posters: {
		file_path: string;
	}[];
}

export interface TmdbErrorResponse {
	status_nessage: string;
	status_code: number;
}

export const PopupTmdbImage: React.FC<IPopupTmdbImage> = ({ item }) => {
	const [imageConfig, setImageConfig] = useState({
		host: '',
		width: {
			movie: '',
			show: '',
		},
	});
	const [imageUrl, setImageUrl] = useState(
		'https://trakt.tv/assets/placeholders/thumb/poster-2d5709c1b640929ca1ab60137044b152.png'
	);

	useEffect(() => {
		const getConfig = async (): Promise<void> => {
			try {
				const responseText = await Requests.send({
					url: `https://api.themoviedb.org/3/configuration?api_key=${secrets.tmdbApiKey}`,
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as TmdbConfigResponse;
				setImageConfig({
					host: responseJson.images?.secure_base_url ?? '',
					width: {
						movie: responseJson.images?.poster_sizes?.[2] ?? '',
						show: responseJson.images?.still_sizes?.[2] ?? '',
					},
				});
			} catch (err) {
				Errors.warning('Failed to get TMDB config.', err);
			}
		};

		void getConfig();
	}, []);

	useEffect(() => {
		const getImageUrl = async (): Promise<void> => {
			if (!item?.tmdbId || !imageConfig.host) {
				return;
			}
			try {
				const responseText = await Requests.send({
					url: getApiUrl(),
					method: 'GET',
				});
				const responseJson = JSON.parse(responseText) as TmdbImageResponse | TmdbErrorResponse;
				if (!('status_code' in responseJson)) {
					const image = 'stills' in responseJson ? responseJson.stills[0] : responseJson.posters[0];
					if (image) {
						setImageUrl(`${imageConfig.host}${imageConfig.width[item.type]}${image.file_path}`);
					}
				}
			} catch (err) {
				Errors.warning('Failed to find item on TMDB.', err);
			}
		};

		const getApiUrl = (): string => {
			let type = '';
			let path = '';
			if (item.type === 'show') {
				type = 'tv';
				path = `${item.tmdbId.toString()}/season/${item.season?.toString() ?? ''}/episode/${
					item.episode?.toString() ?? ''
				}`;
			} else {
				type = 'movie';
				path = item.tmdbId.toString();
			}
			return `https://api.themoviedb.org/3/${type}/${path}/images?api_key=${secrets.tmdbApiKey}`;
		};

		void getImageUrl();
	}, [imageConfig, item]);

	return (
		<Box
			className="popup-watching--overlay-image"
			style={{ backgroundImage: `url(${imageUrl})` }}
		></Box>
	);
};

PopupTmdbImage.propTypes = {
	item: PropTypes.instanceOf(TraktItem).isRequired,
};
