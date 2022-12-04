import { I18N } from '@common/I18N';
import { Tabs } from '@common/Tabs';
import { PopupInfo } from '@components/PopupInfo';
import { Button, Typography } from '@mui/material';

export const AboutPage = (): JSX.Element => {
	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	return (
		<PopupInfo>
			<Typography variant="h6">{I18N.translate('aboutMessage')}</Typography>
			<Button
				color="secondary"
				onClick={() => void onLinkClick('https://github.com/trakt-tools/universal-trakt-scrobbler')}
				variant="contained"
			>
				{I18N.translate('readMore')}
			</Button>
		</PopupInfo>
	);
};
