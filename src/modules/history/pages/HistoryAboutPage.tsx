import { I18N } from '@common/I18N';
import { Tabs } from '@common/Tabs';
import { HistoryInfo } from '@components/HistoryInfo';
import { Button, Typography } from '@material-ui/core';
import * as React from 'react';

export const AboutPage: React.FC = () => {
	const onLinkClick = async (url: string) => {
		await Tabs.open(url);
	};

	return (
		<HistoryInfo>
			<Typography variant="h6">{I18N.translate('aboutMessage')}</Typography>
			<Button
				color="secondary"
				onClick={() => onLinkClick('https://github.com/trakt-tools/universal-trakt-scrobbler')}
				variant="contained"
			>
				{I18N.translate('readMore')}
			</Button>
		</HistoryInfo>
	);
};
