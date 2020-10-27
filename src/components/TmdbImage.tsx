import { Box } from '@material-ui/core';
import * as React from 'react';
import { TmdbApi } from '../api/TmdbApi';

interface TmdbImageProps {
	imageUrl?: string | null;
}

export const TmdbImage: React.FC<TmdbImageProps> = ({ imageUrl }: TmdbImageProps) => {
	return (
		<Box>
			<Box
				className="tmdb-image"
				style={{ backgroundImage: `url(${imageUrl ?? TmdbApi.PLACEHOLDER_IMAGE})` }}
			/>
			<Box className="tmdb-image-overlay" />
		</Box>
	);
};
