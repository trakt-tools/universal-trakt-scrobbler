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

export const PopupWatching: React.FC<IPopupWatching> = ({ item }) => {
	const [content, setContent] = React.useState({
		item,
		sendReceiveSuggestions: false,
	});

	const openWrongItemDialog = async () => {
		await EventDispatcher.dispatch('WRONG_ITEM_DIALOG_SHOW', null, {
			serviceId: content.item.serviceId,
			item: content.item,
		});
	};

	React.useEffect(() => {
		const getSendReceiveSuggestions = async () => {
			const { options } = await BrowserStorage.get('options');
			const sendReceiveSuggestions = options?.sendReceiveSuggestions ?? false;
			setContent((prevContent) => ({
				...prevContent,
				sendReceiveSuggestions,
			}));
			if (sendReceiveSuggestions) {
				void loadSuggestions();
			}
		};

		const loadSuggestions = async () => {
			const item = await WrongItemApi.loadItemSuggestions(content.item);
			setContent((prevContent) => ({
				...prevContent,
				item,
			}));
		};

		void getSendReceiveSuggestions();
	}, []);

	React.useEffect(() => {
		const loadImage = async () => {
			const item = await TmdbApi.loadItemImage(content.item);
			setContent((prevContent) => ({
				...prevContent,
				item,
			}));
		};

		void loadImage();
	}, []);

	return (
		<>
			<Box>
				<TmdbImage imageUrl={content.item.imageUrl} />
				<Box className="popup-watching--content">
					<PopupInfo>
						<Typography variant="overline">{I18N.translate('nowScrobbling')}</Typography>
						{content.item.trakt?.type === 'show' ? (
							<>
								<Typography variant="h6">{content.item.trakt.episodeTitle}</Typography>
								<Typography variant="subtitle2">{I18N.translate('from')}</Typography>
								<Typography variant="subtitle1">{content.item.trakt.title}</Typography>
							</>
						) : (
							<Typography variant="h6">{content.item.trakt?.title}</Typography>
						)}
						<Button color="secondary" onClick={openWrongItemDialog}>
							<Typography variant="caption">
								{I18N.translate('isThisWrong')}{' '}
								{content.sendReceiveSuggestions ? (
									typeof content.item.correctionSuggestions === 'undefined' ? (
										<>({I18N.translate('loadingSuggestions')}...)</>
									) : content.item.correctionSuggestions &&
									  content.item.correctionSuggestions.length > 0 ? (
										<>
											(
											{I18N.translate(
												'suggestions',
												content.item.correctionSuggestions.length.toString()
											)}
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
