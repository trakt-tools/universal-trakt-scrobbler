import { CorrectionApi, Suggestion } from '@apis/CorrectionApi';
import { ExactItemDetails, TraktSearch } from '@apis/TraktSearch';
import { BrowserStorage } from '@common/BrowserStorage';
import { Cache } from '@common/Cache';
import { Errors } from '@common/Errors';
import { CorrectionDialogShowData, EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Center } from '@components/Center';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import { Item } from '@models/Item';
import {
	Button,
	CircularProgress,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	Link,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	TextField,
} from '@mui/material';
import { ChangeEvent, useEffect, useState } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

interface CorrectionDialogState {
	isOpen: boolean;
	isLoading: boolean;
	item?: Item;
	isScrobblingItem: boolean;
	url: string;
}

interface SuggestionListItemData {
	suggestions: Suggestion[];
	onCorrectButtonClick: (suggestion: Suggestion) => void;
}

const SuggestionListItem = ({
	index,
	data,
	style,
}: ListChildComponentProps<SuggestionListItemData>): JSX.Element => {
	const suggestion = data.suggestions[index];
	return (
		<ListItem key={index} ContainerComponent="div" ContainerProps={{ style }}>
			<ListItemText
				primary={
					<Link href={CorrectionApi.getSuggestionUrl(suggestion)} target="_blank" rel="noopener">
						{suggestion.title}
					</Link>
				}
				secondary={I18N.translate('suggestedBy', suggestion.count.toString())}
			/>
			<ListItemSecondaryAction>
				<Button variant="contained" onClick={() => data.onCorrectButtonClick(suggestion)}>
					{I18N.translate('use')}
				</Button>
			</ListItemSecondaryAction>
		</ListItem>
	);
};

export const CorrectionDialog = (): JSX.Element => {
	const [dialog, setDialog] = useState<CorrectionDialogState>({
		isOpen: false,
		isLoading: false,
		isScrobblingItem: false,
		url: '',
	});

	const closeDialog = (): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
	};

	const onUrlChange = (event: ChangeEvent<HTMLInputElement>): void => {
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

			const caches = await Cache.get(['itemsToTraktItems', 'traktItems', 'urlsToTraktItems']);
			newItem.trakt = await TraktSearch.find(newItem, caches, exactItemDetails);
			await Cache.set(caches);

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
			await EventDispatcher.dispatch(
				dialog.isScrobblingItem ? 'SCROBBLING_ITEM_CORRECTED' : 'ITEM_CORRECTED',
				null,
				{
					oldItem: Item.save(oldItem),
					newItem: Item.save(newItem),
				}
			);
		} catch (err) {
			if (Errors.validate(err)) {
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

	useEffect(() => {
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
		<CustomDialogRoot
			open={dialog.isOpen}
			aria-labelledby="correction-dialog-title"
			onClose={closeDialog}
		>
			<DialogTitle id="correction-dialog-title">{I18N.translate('correctItem')}</DialogTitle>
			{dialog.isLoading ? (
				<Center>
					<CircularProgress />
				</Center>
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
									: I18N.translate('unknown')
							)}
						</DialogContentText>
						{dialog.item?.suggestions && dialog.item.suggestions.length > 0 && (
							<>
								<Divider />
								<DialogContentText
									sx={{
										marginTop: 1,
									}}
								>
									{I18N.translate('suggestions')}:
								</DialogContentText>
								<FixedSizeList
									height={72 * 3} // Show a maximum of 3 items at all times
									itemCount={dialog.item.suggestions.length}
									itemData={{
										suggestions: dialog.item.suggestions,
										onCorrectButtonClick,
									}}
									itemSize={72}
									width="100%"
								>
									{SuggestionListItem}
								</FixedSizeList>
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
							margin="normal"
							size="small"
							onChange={onUrlChange}
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={closeDialog}>{I18N.translate('cancel')}</Button>
						<Button
							disabled={!dialog.url || urlError}
							variant="contained"
							onClick={() => onCorrectButtonClick()}
						>
							{I18N.translate('correct')}
						</Button>
					</DialogActions>
				</>
			)}
		</CustomDialogRoot>
	);
};
