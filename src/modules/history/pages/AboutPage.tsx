import { Button, Typography } from '@material-ui/core';
import * as React from 'react';
import { Tabs } from '../../../services/Tabs';
import { HistoryInfo } from '../components/HistoryInfo';

export const AboutPage: React.FC = () => {
	const onLinkClick = async (url: string) => {
		await Tabs.open(url);
	};

	return (
		<HistoryInfo>
			<Typography variant="h6">{browser.i18n.getMessage('aboutMessage')}</Typography>
			<Button
				color="secondary"
				onClick={() => onLinkClick('https://github.com/trakt-tools/universal-trakt-sync')}
				variant="contained"
			>
				{browser.i18n.getMessage('readMore')}
			</Button>
		</HistoryInfo>
	);
};
