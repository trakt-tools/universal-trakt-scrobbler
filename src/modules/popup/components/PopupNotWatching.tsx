import { Typography } from '@material-ui/core';
import * as React from 'react';
import { PopupInfo } from './PopupInfo';

export const PopupNotWatching: React.FC = () => {
	return (
		<PopupInfo>
			<Typography variant="h6">{browser.i18n.getMessage('notWatching')}</Typography>
		</PopupInfo>
	);
};
