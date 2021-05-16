import { Box, Button, Typography } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { TmdbApi } from '../../../api/TmdbApi';
import { WrongItemApi } from '../../../api/WrongItemApi';
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
}

export const PopupWatching: React.FC<IPopupWatching> = ({ item: itemParam }) => {
	const [item, setItem] = React.useState(itemParam);

	const openWrongItemDialog = async () => {
		await EventDispatcher.dispatch('WRONG_ITEM_DIALOG_SHOW', null, {
			serviceId: item.serviceId,
			item,
		});
	};

	React.useEffect(() => {
		const loadSuggestions = async () => {
			if (!BrowserStorage.options.sendReceiveSuggestions) {
				return;
			}
			const newItem = await WrongItemApi.loadItemSuggestions(item);
			setItem(newItem);
		};

		void loadSuggestions();
	}, []);

	React.useEffect(() => {
		const loadImage = async () => {
			const newItem = await TmdbApi.loadItemImage(item);
			setItem(newItem);
		};

		void loadImage();
	}, []);

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
					</PopupInfo>
				</Box>
			</Box>
			<WrongItemDialog />
			<UtsSnackbar />
		</>
	);
};

PopupWatching.propTypes = {
	item: PropTypes.instanceOf(Item).isRequired,
};
