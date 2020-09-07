import { Box, Button, Typography } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { WrongItemApi } from '../../../api/WrongItemApi';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { UtsSnackbar } from '../../../components/UtsSnackbar';
import { WrongItemDialog } from '../../../components/WrongItemDialog';
import { Item } from '../../../models/Item';
import { PopupInfo } from './PopupInfo';
import { PopupTmdbImage } from './PopupTmdbImage';

export interface IPopupWatching {
	item: Item;
}

export const PopupWatching: React.FC<IPopupWatching> = ({ item }) => {
	return (
		<Box>
			<PopupTmdbImage item={item} />
			<Box className="popup-watching--overlay-color" />
			<Box className="popup-watching--content">
				<PopupInfo>
					<Typography variant="overline">{I18N.translate('nowScrobbling')}</Typography>
					{item.trakt?.type === 'show' ? (
						<>
							<Typography variant="h6">{item.trakt.episodeTitle}</Typography>
							<Typography variant="subtitle2">{I18N.translate('from')}</Typography>
							<Typography variant="subtitle1">{item.trakt.title}</Typography>
						</>
					) : (
						<Typography variant="h6">{item.trakt?.title}</Typography>
					)}
				</PopupInfo>
			</Box>
		</Box>
	);
};

PopupWatching.propTypes = {
	item: PropTypes.instanceOf(Item).isRequired,
};
