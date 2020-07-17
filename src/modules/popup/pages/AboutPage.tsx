import { Button, Typography } from '@material-ui/core';
import * as React from 'react';
import { Tabs } from '../../../services/Tabs';
import { PopupInfo } from '../components/PopupInfo';

export const AboutPage: React.FC = () => {
	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	return (
		<PopupInfo>
			<Typography variant="h6">{browser.i18n.getMessage('aboutMessage')}</Typography>
			<Button
				color="secondary"
				onClick={() => onLinkClick('https://github.com/trakt-tools/universal-trakt-scrobbler')}
				variant="contained"
			>
				{browser.i18n.getMessage('readMore')}
			</Button>
		</PopupInfo>
	);
};
