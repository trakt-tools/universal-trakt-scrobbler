import { Box, Button, LinearProgress, Tooltip, Typography } from '@material-ui/core';
import PauseIcon from '@material-ui/icons/Pause';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { TmdbImage } from '../../../components/TmdbImage';
import { UtsSnackbar } from '../../../components/UtsSnackbar';
import { WrongItemDialog } from '../../../components/WrongItemDialog';
import { Item } from '../../../models/Item';
import { PopupInfo } from './PopupInfo';

export interface IPopupWatching {
	item: Item;
	isPaused: boolean;
}

export const PopupWatching: React.FC<IPopupWatching> = ({ item, isPaused }) => {
	const openWrongItemDialog = async () => {
		await EventDispatcher.dispatch('WRONG_ITEM_DIALOG_SHOW', null, {
			serviceId: item.serviceId,
			item,
		});
	};

	return (
		<>
			<Box>
				<TmdbImage imageUrl={item.imageUrl} />
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
						<Button color="secondary" onClick={openWrongItemDialog}>
							<Typography variant="caption">
								{I18N.translate('isThisWrong')}{' '}
								{BrowserStorage.options.sendReceiveSuggestions ? (
									typeof item.correctionSuggestions === 'undefined' ? (
										<>({I18N.translate('loadingSuggestions')}...)</>
									) : item.correctionSuggestions && item.correctionSuggestions.length > 0 ? (
										<>
											({I18N.translate('suggestions', item.correctionSuggestions.length.toString())}
											)
										</>
									) : null
								) : null}
							</Typography>
						</Button>
						{item.progress > 0.0 && (
							<Tooltip title={I18N.translate('progress', item.progress.toString())}>
								<LinearProgress
									classes={{ root: 'popup-watching-progress' }}
									value={item.progress}
									variant="determinate"
								/>
							</Tooltip>
						)}
					</PopupInfo>
				</Box>
			</Box>
			{isPaused && (
				<>
					<Box className="popup-container--overlay-color">
						<PauseIcon />
					</Box>
				</>
			)}
			<WrongItemDialog />
			<UtsSnackbar />
		</>
	);
};

PopupWatching.propTypes = {
	item: PropTypes.instanceOf(Item).isRequired,
	isPaused: PropTypes.bool.isRequired,
};
