import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { CorrectionDialog } from '@components/CorrectionDialog';
import { CustomSnackbar } from '@components/CustomSnackbar';
import { PopupInfo } from '@components/PopupInfo';
import { PopupOverlay } from '@components/PopupOverlay';
import { TmdbImage } from '@components/TmdbImage';
import { ScrobbleItem } from '@models/Item';
import { Pause as PauseIcon } from '@mui/icons-material';
import { Box, Button, LinearProgress, Tooltip, Typography } from '@mui/material';

export interface PopupWatchingProps {
	item: ScrobbleItem;
	isPaused: boolean;
}

export const PopupWatching = ({ item, isPaused }: PopupWatchingProps): JSX.Element => {
	const openCorrectionDialog = async () => {
		await Shared.events.dispatch('CORRECTION_DIALOG_SHOW', null, {
			item,
			isScrobblingItem: true,
		});
	};

	return (
		<>
			<Box>
				<TmdbImage imageUrl={item.imageUrl} />
				<Box
					sx={{
						position: 'relative',
						height: 1,

						'& > *': {
							height: 1,
						},
					}}
				>
					<PopupInfo>
						<Typography variant="overline">{I18N.translate('nowScrobbling')}</Typography>
						{item.trakt?.type === 'episode' ? (
							<>
								<Typography variant="h6">{item.trakt.title}</Typography>
								<Typography variant="subtitle2">{I18N.translate('from')}</Typography>
								<Typography variant="subtitle1">{item.trakt.show.title}</Typography>
							</>
						) : (
							<Typography variant="h6">{item.trakt?.title}</Typography>
						)}
						<Button color="secondary" onClick={() => void openCorrectionDialog()}>
							<Typography variant="caption">
								{I18N.translate('isThisWrong')}{' '}
								{Shared.storage.options.sendReceiveSuggestions ? (
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
									value={item.progress}
									variant="determinate"
									sx={{
										position: 'absolute',
										bottom: 0,
										left: 0,
										width: 1,
										height: ({ spacing }) => spacing(1),
									}}
								/>
							</Tooltip>
						)}
					</PopupInfo>
				</Box>
			</Box>
			{isPaused && (
				<PopupOverlay>
					<PauseIcon />
				</PopupOverlay>
			)}
			<CorrectionDialog />
			<CustomSnackbar />
		</>
	);
};
