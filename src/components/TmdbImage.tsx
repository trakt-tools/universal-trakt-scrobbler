import { Box } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { TmdbApi } from '../api/TmdbApi';
import { TraktItem } from '../models/TraktItem';

interface TmdbImageProps {
	item?: TraktItem | null;
}

export const TmdbImage: React.FC<TmdbImageProps> = ({ item }: TmdbImageProps) => {
	const [imageUrl, setImageUrl] = useState(TmdbApi.PLACEHOLDER_IMAGE);
	const mounted = useRef(false);

	useEffect(() => {
		mounted.current = true;

		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		const loadImage = async () => {
			const foundImageUrl = await TmdbApi.findImage(item);
			if (mounted.current) {
				setImageUrl(foundImageUrl);
			}
		};

		void loadImage();
	}, [item]);

	return (
		<Box>
			<Box className="tmdb-image" style={{ backgroundImage: `url(${imageUrl})` }} />
			<Box className="tmdb-image-overlay" />
		</Box>
	);
};
