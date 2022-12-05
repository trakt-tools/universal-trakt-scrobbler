import { MissingWatchedDateDialogShowData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Center } from '@components/Center';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import { ScrobbleItem } from '@models/Item';
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
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ChangeEvent, ReactNode, useEffect, useState } from 'react';

interface MissingWatchedDateDialogState {
	isOpen: boolean;
	isLoading: boolean;
	items: ScrobbleItem[];
	dateType: MissingWatchedDateType | null;
	date: number | null;
	dateError: ReactNode | null;
}

export type MissingWatchedDateType = 'release-date' | 'current-date' | 'custom-date';

export const MissingWatchedDateDialog = (): JSX.Element => {
	const [dialog, setDialog] = useState<MissingWatchedDateDialogState>({
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

	const onDateTypeChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const { target } = event;
		setDialog((prevDialog) => ({
			...prevDialog,
			dateType: target.value as MissingWatchedDateType,
		}));
	};

	const onDateChange = (date: number | null): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			date,
		}));
	};

	const onDateAccept = (date: number | null): void => {
		setDialog((prevDialog) => ({
			...prevDialog,
			date,
			dateError: null,
		}));
	};

	const onDateError = (err: ReactNode): void => {
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
						item.watchedAt = releaseDate;
					}
					break;
				}
				case 'current-date': {
					const now = Utils.unix();
					for (const item of newItems) {
						item.watchedAt = now;
					}
					break;
				}
				case 'custom-date': {
					if (!dialog.date || !!dialog.dateError) {
						throw new Error('Missing date or invalid date');
					}
					const customDate = Utils.unix(dialog.date);
					for (const item of newItems) {
						item.watchedAt = customDate;
					}
					break;
				}
				// no-default
			}
			for (const item of newItems) {
				if (item.trakt) {
					delete item.trakt.watchedAt;
				}
			}
			await Shared.events.dispatch('MISSING_WATCHED_DATE_ADDED', null, {
				oldItems,
				newItems,
			});
		} catch (err) {
			if (Shared.errors.validate(err)) {
				Shared.errors.error('Failed to add missing watched date.', err);
				await Shared.events.dispatch('SNACKBAR_SHOW', null, {
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

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('MISSING_WATCHED_DATE_DIALOG_SHOW', null, openDialog);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('MISSING_WATCHED_DATE_DIALOG_SHOW', null, openDialog);
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
											dialog.items[0].type === 'episode'
												? `S${dialog.items[0].season?.toString() ?? '0'} E${
														dialog.items[0].number?.toString() ?? '0'
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
							<LocalizationProvider dateAdapter={AdapterDateFns}>
								<DateTimePicker
									value={dialog.date}
									inputFormat="yyyy/MM/dd HH:mm"
									maxDateTime={Date.now()}
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
							onClick={() => void onAddButtonClick()}
						>
							{I18N.translate('add')}
						</Button>
					</DialogActions>
				</>
			)}
		</CustomDialogRoot>
	);
};
