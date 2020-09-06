import { Box, Typography } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { I18N } from '../../../common/I18N';
import { TraktItem } from '../../../models/TraktItem';
import { PopupInfo } from './PopupInfo';
import { PopupTmdbImage } from './PopupTmdbImage';

interface IPopupWatching {
	item: TraktItem;
}

export const PopupWatching: React.FC<IPopupWatching> = ({ item }) => {
	return (
		<Box>
			<PopupTmdbImage item={item} />
			<Box className="popup-watching--overlay-color" />
			<Box className="popup-watching--content">
				<PopupInfo>
					<Typography variant="overline">{I18N.translate('nowScrobbling')}</Typography>
					{item.type === 'show' ? (
						<>
							<Typography variant="h6">{item.episodeTitle}</Typography>
							<Typography variant="subtitle2">{I18N.translate('from')}</Typography>
							<Typography variant="subtitle1">{item.title}</Typography>
						</>
					) : (
						<Typography variant="h6">{item.title}</Typography>
					)}
				</PopupInfo>
			</Box>
		</Box>
	);
};

PopupWatching.propTypes = {
	item: PropTypes.instanceOf(TraktItem).isRequired,
};
