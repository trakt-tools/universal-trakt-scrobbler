import { I18N } from '@common/I18N';
import { PopupInfo } from '@components/PopupInfo';
import { Typography } from '@mui/material';

export const PopupNotWatching = (): JSX.Element => {
	return (
		<PopupInfo>
			<Typography variant="h6">{I18N.translate('notWatching')}</Typography>
		</PopupInfo>
	);
};
