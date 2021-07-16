import { CorrectionApi, Suggestion } from '@apis/CorrectionApi';
import { ExactItemDetails, TraktSearch } from '@apis/TraktSearch';
import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { CorrectionDialogShowData, EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Messaging } from '@common/Messaging';
import { RequestException } from '@common/Requests';
import { Shared } from '@common/Shared';
import { UtsCenter } from '@components/UtsCenter';
import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	Link,
	List,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	TextField,
} from '@material-ui/core';
import { Item } from '@models/Item';
import * as React from 'react';

interface CorrectionDialogState {
	isOpen: boolean;
	isLoading: boolean;
	serviceId: string | null;
	item?: Item;
	url: string;
}

export const CorrectionDialog: React.FC = () => {
	const [dialog, setDialog] = React.useState<CorrectionDialogState>({
		isOpen: false,
		isLoading: false,
		serviceId: null,
		url: '',
	});

	const closeDialog = (): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
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

	const onCorrectButtonClick = async (suggestion?: Suggestion): Promise<void> => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isLoading: true,
		}));
		try {
			if (!dialog.item) {
				throw new Error('Missing item');
			}
			const oldItem = dialog.item;
			let exactItemDetails: ExactItemDetails;
			if (suggestion) {
				exactItemDetails = {
					type: suggestion.type,
					id: suggestion.id,
				};
			} else {
				if (!isValidUrl(dialog.url)) {
					throw new Error('Invalid URL');
				}
				const url = cleanUrl(dialog.url);
				exactItemDetails = { url };
			}
			const newItem = oldItem.clone();
			delete newItem.trakt;
			delete newItem.imageUrl;
			newItem.trakt = await TraktSearch.find(newItem, exactItemDetails);
			if (!newItem.trakt) {
				throw new Error('Failed to find item');
			}
			if (!suggestion) {
				suggestion = {
					type: newItem.trakt.type === 'show' ? 'episode' : 'movie',
					id: newItem.trakt.id,
					title: newItem.trakt.title,
					count: 1,
				};
			}
			const databaseId = newItem.getDatabaseId();
			let { corrections } = await BrowserStorage.get('corrections');
			if (!corrections) {
				corrections = {};
			}
			corrections[databaseId] = suggestion;
			await BrowserStorage.set({ corrections }, true);
			await CorrectionApi.saveSuggestion(newItem, suggestion);
			await EventDispatcher.dispatch('ITEM_CORRECTED', dialog.serviceId, {
				oldItem,
				newItem,
			});
			if (Shared.pageType === 'popup') {
				const scrobblingInfo = await Messaging.toBackground({ action: 'get-scrobbling-info' });
				if (scrobblingInfo.tabId) {
					await Messaging.toContent(
						{
							action: 'item-corrected',
							oldItem: Item.save(oldItem),
							newItem: Item.save(newItem),
						},
						scrobblingInfo.tabId
					);
				}
			}
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to correct item.', err);
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'correctItemFailed',
					severity: 'error',
				});
			}
		}
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
	};

	const validUrlRegex =
		/\/shows\/([\w-]+)\/seasons\/([\w-]+)\/episodes\/([\w-]+)|\/movies\/([\w-]+)/;

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
			EventDispatcher.subscribe('CORRECTION_DIALOG_SHOW', null, openDialog);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('CORRECTION_DIALOG_SHOW', null, openDialog);
		};

		const openDialog = (data: CorrectionDialogShowData) => {
			setDialog({
				isOpen: true,
				isLoading: false,
				...data,
				url: '',
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	const [urlLabel, urlError] =
		!dialog.url || isValidUrl(dialog.url)
			? ['URL', false]
			: [I18N.translate('invalidTraktUrl'), true];

	return (
		<Dialog
			classes={{ paper: 'correction-dialog' }}
			open={dialog.isOpen}
			aria-labelledby="correction-dialog-title"
			onClose={closeDialog}
		>
			<DialogTitle id="correction-dialog-title">{I18N.translate('correctItem')}</DialogTitle>
			{dialog.isLoading ? (
				<UtsCenter>
					<CircularProgress />
				</UtsCenter>
			) : (
				<>
					<DialogContent>
						{dialog.item?.trakt?.watchedAt && (
							<DialogContentText color="error">
								{I18N.translate('correctionDialogSyncedWarning')}
							</DialogContentText>
						)}
						<DialogContentText>
							{I18N.translate(
								dialog.item?.suggestions && dialog.item.suggestions.length > 0
									? 'correctionDialogContentWithSuggestions'
									: 'correctionDialogContent',
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
						{dialog.item?.suggestions && dialog.item.suggestions.length > 0 && (
							<>
								<Divider />
								<DialogContentText className="correction-dialog-suggestions-title">
									{I18N.translate('suggestions')}:
								</DialogContentText>
								<List>
									{dialog.item.suggestions.map((suggestion, index) => (
										<ListItem key={index}>
											<ListItemText
												primary={
													<Link
														href={CorrectionApi.getSuggestionUrl(suggestion)}
														target="_blank"
														rel="noopener"
													>
														{suggestion.title}
													</Link>
												}
												secondary={I18N.translate('suggestedBy', suggestion.count.toString())}
											/>
											<ListItemSecondaryAction>
												<Button
													color="primary"
													variant="contained"
													onClick={() => onCorrectButtonClick(suggestion)}
												>
													{I18N.translate('use')}
												</Button>
											</ListItemSecondaryAction>
										</ListItem>
									))}
								</List>
								<Divider />
							</>
						)}
						<TextField
							type="string"
							id="correction-dialog-url"
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
							onClick={() => onCorrectButtonClick()}
						>
							{I18N.translate('correct')}
						</Button>
					</DialogActions>
				</>
			)}
		</Dialog>
	);
};
