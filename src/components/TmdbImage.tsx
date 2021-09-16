import { FullView } from '@components/FullView';
import TraktIconImage from '@images/trakt-icon.png';
import { Box } from '@mui/material';
import React from 'react';

interface TmdbImageProps {
	imageUrl?: string | null;
}

export const TmdbImage: React.FC<TmdbImageProps> = ({ imageUrl }: TmdbImageProps) => {
	return (
		<Box>
			<FullView
				sx={{
					backgroundColor: '#000',
					backgroundImage: `url("${imageUrl || TraktIconImage}")`,
					backgroundPosition: 'center',
					backgroundSize: 'cover',
					backgroundRepeat: 'no-repeat',
				}}
			/>
			<FullView
				sx={{
					backgroundColor: 'rgba(0, 0, 0, 0.5)',
				}}
			/>
		</Box>
	);
};
