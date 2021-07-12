import { I18N } from '@common/I18N';
import { PopupInfo } from '@components/PopupInfo';
import { Typography } from '@material-ui/core';
import * as React from 'react';

export const PopupNotWatching: React.FC = () => {
	return (
		<PopupInfo>
			<Typography variant="h6">{I18N.translate('notWatching')}</Typography>
		</PopupInfo>
	);
};
