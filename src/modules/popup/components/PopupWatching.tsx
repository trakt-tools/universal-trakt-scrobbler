import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { CorrectionDialog } from '@components/CorrectionDialog';
import { PopupInfo } from '@components/PopupInfo';
import { TmdbImage } from '@components/TmdbImage';
import { UtsSnackbar } from '@components/UtsSnackbar';
import { Box, Button, LinearProgress, Tooltip, Typography } from '@material-ui/core';
import PauseIcon from '@material-ui/icons/Pause';
import { Item } from '@models/Item';
import PropTypes from 'prop-types';
import React from 'react';

export interface IPopupWatching {
	item: Item;
	isPaused: boolean;
}

export const PopupWatching: React.FC<IPopupWatching> = ({ item, isPaused }) => {
	const openCorrectionDialog = async () => {
		await EventDispatcher.dispatch('CORRECTION_DIALOG_SHOW', null, {
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
						<Button color="secondary" onClick={openCorrectionDialog}>
							<Typography variant="caption">
								{I18N.translate('isThisWrong')}{' '}
								{BrowserStorage.options.sendReceiveSuggestions ? (
									typeof item.suggestions === 'undefined' ? (
										<>({I18N.translate('loadingSuggestions')}...)</>
									) : item.suggestions && item.suggestions.length > 0 ? (
										<>
											({I18N.translate('suggestions')}: {item.suggestions.length.toString()})
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
			<CorrectionDialog />
			<UtsSnackbar />
		</>
	);
};

PopupWatching.propTypes = {
	item: PropTypes.instanceOf(Item).isRequired,
	isPaused: PropTypes.bool.isRequired,
};
