import { Errors } from '@common/Errors';
import { EventDispatcher, MissingWatchedDateDialogShowData } from '@common/Events';
import { I18N } from '@common/I18N';
import { RequestException } from '@common/Requests';
import { Center } from '@components/Center';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import { Item } from '@models/Item';
import { DateTimePicker, LocalizationProvider } from '@mui/lab';
import DateAdapter from '@mui/lab/AdapterMoment';
import {
	Button,
	CircularProgress,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
	Radio,
	RadioGroup,
	TextField,
} from '@mui/material';
import moment from 'moment';
import React from 'react';

interface MissingWatchedDateDialogState {
	isOpen: boolean;
	isLoading: boolean;
	items: Item[];
	dateType: MissingWatchedDateType | null;
	date: moment.Moment | null;
	dateError: React.ReactNode | null;
}

export type MissingWatchedDateType = 'release-date' | 'current-date' | 'custom-date';

export const MissingWatchedDateDialog: React.FC = () => {
	const [dialog, setDialog] = React.useState<MissingWatchedDateDialogState>({
		isOpen: false,
		isLoading: false,
		items: [],
		dateType: null,
		date: null,
		dateError: null,
	});

	const closeDialog = (): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
	};

	const onDateTypeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
		const { target } = event;
		setDialog((prevDialog) => ({
			...prevDialog,
			dateType: target.value as MissingWatchedDateType,
		}));
	};

	const onDateChange = (date: moment.Moment | null): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			date,
		}));
	};

	const onDateAccept = (date: moment.Moment | null): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			date,
			dateError: null,
		}));
	};

	const onDateError = (err: React.ReactNode): void => {
		if (err !== dialog.dateError) {
			setDialog((prevDialog) => ({
				...prevDialog,
				dateError: err,
			}));
		}
	};

	const onAddButtonClick = async (): Promise<void> => {
		setDialog((prevDialog) => ({
			...prevDialog,
			isLoading: true,
		}));
		try {
			if (!dialog.dateType) {
				throw new Error('Missing date type');
			}
			const oldItems = dialog.items;
			const newItems = oldItems.map((item) => item.clone());
			switch (dialog.dateType) {
				case 'release-date': {
					for (const item of newItems) {
						const releaseDate = item.trakt?.releaseDate;
						if (!releaseDate) {
							throw new Error('Missing release date');
						}
						item.watchedAt = releaseDate.clone();
					}
					break;
				}
				case 'current-date':
					for (const item of newItems) {
						item.watchedAt = moment();
					}
					break;
				case 'custom-date':
					if (!dialog.date || !!dialog.dateError) {
						throw new Error('Missing date or invalid date');
					}
					for (const item of newItems) {
						item.watchedAt = dialog.date;
					}
					break;
				// no-default
			}
			for (const item of newItems) {
				if (item.trakt) {
					delete item.trakt.watchedAt;
				}
			}
			await EventDispatcher.dispatch('MISSING_WATCHED_DATE_ADDED', null, {
				oldItems,
				newItems,
			});
		} catch (err) {
			if (!(err as RequestException).canceled) {
				Errors.error('Failed to add missing watched date.', err);
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'addMissingWatchedDateFailed',
					severity: 'error',
				});
			}
		}
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
	};

	React.useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('MISSING_WATCHED_DATE_DIALOG_SHOW', null, openDialog);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('MISSING_WATCHED_DATE_DIALOG_SHOW', null, openDialog);
		};

		const openDialog = (data: MissingWatchedDateDialogShowData) => {
			setDialog({
				isOpen: true,
				isLoading: false,
				...data,
				dateType: null,
				date: null,
				dateError: null,
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	const dateLabel = I18N.translate('missingWatchedDateDialogDateLabel');
	const invalidDateLabel = I18N.translate('missingWatchedDateDialogInvalidDateLabel');

	return (
		<CustomDialogRoot
			open={dialog.isOpen}
			aria-labelledby="missing-watched-date-item-dialog-title"
			onClose={closeDialog}
		>
			<DialogTitle id="missing-watched-date-item-dialog-title">
				{I18N.translate('missingWatchedDate')}
			</DialogTitle>
			{dialog.isLoading || dialog.items.length === 0 ? (
				<Center>
					<CircularProgress />
				</Center>
			) : (
				<>
					<DialogContent>
						<DialogContentText>
							{dialog.items.length > 1
								? I18N.translate(
										'missingWatchedDateDialogContentMultiple',
										dialog.items.length.toString()
								  )
								: I18N.translate(
										'missingWatchedDateDialogContent',
										`${dialog.items[0].title} ${
											dialog.items[0].type === 'show'
												? `S${dialog.items[0].season?.toString() ?? '0'} E${
														dialog.items[0].episode?.toString() ?? '0'
												  }`
												: `(${dialog.items[0].year.toString()})`
										}`
								  )}
						</DialogContentText>
						<RadioGroup
							name="date-type"
							value={dialog.dateType}
							aria-label="date-type"
							onChange={onDateTypeChange}
						>
							<FormControlLabel
								label={I18N.translate('useReleaseDate')}
								value="release-date"
								control={<Radio />}
							/>
							<FormControlLabel
								label={I18N.translate('useCurrentDate')}
								value="current-date"
								control={<Radio />}
							/>
							<FormControlLabel
								label={I18N.translate('useCustomDate')}
								value="custom-date"
								control={<Radio />}
							/>
						</RadioGroup>
						{dialog.dateType === 'custom-date' && (
							<LocalizationProvider dateAdapter={DateAdapter}>
								<DateTimePicker
									value={dialog.date}
									inputFormat="YYYY/MM/DD HH:mm"
									maxDateTime={moment()}
									onChange={onDateChange}
									onAccept={onDateAccept}
									onError={onDateError}
									renderInput={(props) => (
										<TextField
											label={dialog.dateError ? invalidDateLabel : dateLabel}
											error={!!dialog.dateError}
											{...props}
										/>
									)}
								/>
							</LocalizationProvider>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={closeDialog}>{I18N.translate('cancel')}</Button>
						<Button
							disabled={
								!dialog.dateType ||
								(dialog.dateType === 'custom-date' && (!dialog.date || !!dialog.dateError))
							}
							variant="contained"
							onClick={onAddButtonClick}
						>
							{I18N.translate('add')}
						</Button>
					</DialogActions>
				</>
			)}
		</CustomDialogRoot>
	);
};
