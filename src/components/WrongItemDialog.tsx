import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	TextField,
} from '@material-ui/core';
import * as React from 'react';
import { Item } from '../models/Item';
import { BrowserStorage } from '../common/BrowserStorage';
import { Errors } from '../common/Errors';
import { EventDispatcher, WrongItemDialogShowData } from '../common/Events';
import { StreamingServiceId, streamingServices } from '../streaming-services/streaming-services';
import { UtsCenter } from './UtsCenter';

interface WrongItemDialogState {
	isOpen: boolean;
	isLoading: boolean;
	serviceId?: StreamingServiceId;
	item?: Item;
	url: string;
}

export const WrongItemDialog: React.FC = () => {
	const [dialog, setDialog] = React.useState<WrongItemDialogState>({
		isOpen: false,
		isLoading: false,
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
		setDialog((prevDialog) => ({
			...prevDialog,
			url: target.value,
		}));
	};

	const onCorrectButtonClick = async (): Promise<void> => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isLoading: true,
		}));
		try {
			if (!dialog.serviceId || !dialog.item) {
				throw new Error('Missing service ID or item');
			}
			if (!isValidUrl(dialog.url)) {
				throw new Error('Invalid URL');
			}
			const url = cleanUrl(dialog.url);
			const storage = await BrowserStorage.get('correctUrls');
			let { correctUrls } = storage;
			if (!correctUrls) {
				correctUrls = Object.fromEntries(
					Object.keys(streamingServices).map((serviceId) => [serviceId, {}])
				) as Record<StreamingServiceId, Record<string, string>>;
			}
			if (!correctUrls[dialog.serviceId]) {
				correctUrls[dialog.serviceId] = {};
			}
			const serviceCorrectUrls = correctUrls[dialog.serviceId];
			if (serviceCorrectUrls) {
				serviceCorrectUrls[dialog.item.id] = url;
			}
			await BrowserStorage.set({ correctUrls }, true);
			await EventDispatcher.dispatch('WRONG_ITEM_CORRECTED', dialog.serviceId, {
				item: dialog.item,
				url,
			});
		} catch (err) {
			Errors.error('Failed to correct item.', err);
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'correctWrongItemFailed',
				severity: 'error',
			});
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
