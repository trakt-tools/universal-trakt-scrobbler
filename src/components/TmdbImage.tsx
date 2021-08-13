import { Box } from '@material-ui/core';
import React from 'react';

interface TmdbImageProps {
	imageUrl?: string | null;
}

export const TmdbImage: React.FC<TmdbImageProps> = ({ imageUrl }: TmdbImageProps) => {
	return (
		<Box>
			<Box
				className="tmdb-image"
				style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
			/>
			<Box className="tmdb-image-overlay" />
		</Box>
	);
};
