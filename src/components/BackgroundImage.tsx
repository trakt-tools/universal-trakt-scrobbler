import { FullView } from '@components/FullView';
import TraktIconImage from '@images/trakt-icon.png';
import { Box } from '@mui/material';

interface BackgroundImageProps {
	imageUrl?: string | null;
	/** Fallback image in case {@link imageUrl} is falsy. Defaults to the Trakt logo. */
	fallbackImageUrl?: string;
}

export const BackgroundImage = ({
	imageUrl,
	fallbackImageUrl = TraktIconImage,
}: BackgroundImageProps): JSX.Element => {
	return (
		<Box>
			<FullView
				sx={{
					backgroundColor: '#000',
					backgroundImage: `url("${imageUrl || fallbackImageUrl}")`,
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
