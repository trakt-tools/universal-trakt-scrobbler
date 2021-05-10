import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	List,
	ListItem,
	ListItemText,
	TextField,
} from '@material-ui/core';
import * as React from 'react';
import { BrowserStorage, CorrectItem } from '../common/BrowserStorage';
import { Errors } from '../common/Errors';
import { EventDispatcher, WrongItemDialogShowData } from '../common/Events';
import { I18N } from '../common/I18N';
import { Messaging } from '../common/Messaging';
import { RequestException } from '../common/Requests';
import { Shared } from '../common/Shared';
import { CorrectionSuggestion, Item } from '../models/Item';
import { StreamingServiceId, streamingServices } from '../streaming-services/streaming-services';
import { UtsCenter } from './UtsCenter';

interface WrongItemDialogState {
	isOpen: boolean;
	isLoading: boolean;
	serviceId: StreamingServiceId | null;
	item?: Item;
	type: 'episode' | 'movie';
	traktId?: number;
	url: string;
}

export const WrongItemDialog: React.FC = () => {
	const [dialog, setDialog] = React.useState<WrongItemDialogState>({
		isOpen: false,
		isLoading: false,
		serviceId: null,
		type: 'episode',
		traktId: 0,
		url: '',
	});

	const closeDialog = (): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
	};

	const onUseButtonClick = (correctionSuggestion: CorrectionSuggestion): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			type: correctionSuggestion.type,
			traktId: correctionSuggestion.traktId,
			url: correctionSuggestion.url,
		}));
	};

	const onUrlChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
		const { target } = event;
		const url = target.value;
		setDialog((prevDialog) => ({
			...prevDialog,
			type: url.includes('shows') ? 'episode' : 'movie',
			traktId: 0,
			url: target.value,
		}));
	};

	const onCorrectButtonClick = async (): Promise<void> => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isLoading: true,
		}));
		try {
			if (!dialog.item) {
				throw new Error('Missing item');
			}
			if (!isValidUrl(dialog.url)) {
				throw new Error('Invalid URL');
			}
			const url = cleanUrl(dialog.url);
			let { correctItems } = await BrowserStorage.get('correctItems');
			if (!correctItems) {
				correctItems = Object.fromEntries(
					Object.keys(streamingServices).map((serviceId) => [serviceId, {}])
				) as Record<StreamingServiceId, Record<string, CorrectItem>>;
			}
			if (!correctItems[dialog.item.serviceId]) {
				correctItems[dialog.item.serviceId] = {};
			}
			const serviceCorrectItems = correctItems[dialog.item.serviceId];
			if (serviceCorrectItems) {
				serviceCorrectItems[dialog.item.id] = {
					type: dialog.type,
					traktId: dialog.traktId,
					url,
				};
			}
			await BrowserStorage.set({ correctItems }, true);
			const data = {
				item: dialog.item,
				type: dialog.type,
				traktId: dialog.traktId,
				url,
			};
			await EventDispatcher.dispatch('WRONG_ITEM_CORRECTED', dialog.serviceId, data);
			if (Shared.pageType === 'popup') {
				const { scrobblingTabId } = await BrowserStorage.get('scrobblingTabId');
				if (scrobblingTabId) {
					await Messaging.toContent({ action: 'wrong-item-corrected', ...data }, scrobblingTabId);
				}
			}
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to correct item.', err);
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'correctWrongItemFailed',
					severity: 'error',
				});
			}
		}
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
	};

	const validUrlRegex = /\/shows\/([\w-]+)\/seasons\/([\w-]+)\/episodes\/([\w-]+)|\/movies\/([\w-]+)/;

	const isValidUrl = (url: string): boolean => {
		return !!validUrlRegex.exec(url);
	};

	const cleanUrl = (url: string): string => {
		const matches = validUrlRegex.exec(url);
		if (!matches) {
			return '';
		}
		const [, showOrMovie, season, episode] = matches;
		return season
			? `/shows/${showOrMovie}/seasons/${season}/episodes/${episode}`
			: `/movies/${showOrMovie}`;
	};

	React.useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('WRONG_ITEM_DIALOG_SHOW', null, openDialog);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('WRONG_ITEM_DIALOG_SHOW', null, openDialog);
		};

		const openDialog = (data: WrongItemDialogShowData) => {
			setDialog({
				isOpen: true,
				isLoading: false,
				...data,
				type: 'episode',
				traktId: 0,
				url: '',
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	const [urlLabel, urlError] =
		!dialog.url || isValidUrl(dialog.url)
			? ['URL', false]
			: [I18N.translate('wrongItemDialogInvalidUrlLabel'), true];

	return (
		<Dialog
			classes={{ paper: 'wrong-item-dialog' }}
			open={dialog.isOpen}
			aria-labelledby="wrong-item-dialog-title"
			onClose={closeDialog}
		>
			<DialogTitle id="wrong-item-dialog-title">{I18N.translate('correctWrongItem')}</DialogTitle>
			{dialog.isLoading ? (
				<UtsCenter>
					<CircularProgress />
				</UtsCenter>
			) : (
				<>
					<DialogContent>
						<DialogContentText>
							{I18N.translate(
								'wrongItemDialogContent',
								dialog.item
									? `${dialog.item.title} ${
											dialog.item.type === 'show'
												? `S${dialog.item.season?.toString() ?? '0'} E${
														dialog.item.episode?.toString() ?? '0'
												  }`
												: `(${dialog.item.year.toString()})`
									  }`
									: 'Unknown'
							)}
						</DialogContentText>
						{dialog.item?.correctionSuggestions && dialog.item.correctionSuggestions.length > 0 && (
							<>
								<Divider />
								<DialogContentText className="wrong-item-dialog-suggestions-title">
									{I18N.translate('wrongItemDialogContentSuggestions')}
								</DialogContentText>
								<List>
									{dialog.item.correctionSuggestions.map((correctionSuggestion, index) => (
										<ListItem
											key={index}
											button
											onClick={() => onUseButtonClick(correctionSuggestion)}
										>
											<ListItemText
												primary={correctionSuggestion.url}
												secondary={I18N.translate(
													'suggestedBy',
													correctionSuggestion.count.toString()
												)}
											/>
										</ListItem>
									))}
								</List>
								<Divider />
							</>
						)}
						<TextField
							type="string"
							id="wrong-item-dialog-url"
							label={urlLabel}
							error={urlError}
							placeholder="https://trakt.tv/shows/dark/seasons/1/episodes/1"
							value={dialog.url}
							autoFocus
							fullWidth
							margin="dense"
							onChange={onUrlChange}
						/>
					</DialogContent>
					<DialogActions>
						<Button color="default" onClick={closeDialog}>
							{I18N.translate('cancel')}
						</Button>
						<Button
							color="primary"
							disabled={!dialog.url || urlError}
							variant="contained"
							onClick={onCorrectButtonClick}
						>
							{I18N.translate('correct')}
						</Button>
					</DialogActions>
				</>
			)}
		</Dialog>
	);
};
