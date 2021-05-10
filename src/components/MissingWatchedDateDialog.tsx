import MomentUtils from '@date-io/moment';
import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
	Radio,
	RadioGroup,
} from '@material-ui/core';
import { KeyboardDateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import * as moment from 'moment';
import * as React from 'react';
import { Errors } from '../common/Errors';
import { EventDispatcher, MissingWatchedDateDialogShowData } from '../common/Events';
import { I18N } from '../common/I18N';
import { RequestException } from '../common/Requests';
import { Item } from '../models/Item';
import { StreamingServiceId } from '../streaming-services/streaming-services';
import { UtsCenter } from './UtsCenter';

interface MissingWatchedDateDialogState {
	isOpen: boolean;
	isLoading: boolean;
	serviceId: StreamingServiceId | null;
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
		serviceId: null,
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
			switch (dialog.dateType) {
				case 'release-date': {
					for (const item of dialog.items) {
						const releaseDate = item.trakt?.releaseDate;
						if (!releaseDate) {
							throw new Error('Missing release date');
						}
						item.watchedAt = moment(releaseDate);
					}
					break;
				}
				case 'current-date':
					for (const item of dialog.items) {
						item.watchedAt = moment();
					}
					break;
				case 'custom-date':
					if (!dialog.date || !!dialog.dateError) {
						throw new Error('Missing date or invalid date');
					}
					for (const item of dialog.items) {
						item.watchedAt = dialog.date;
					}
					break;
				// no-default
			}
			await EventDispatcher.dispatch('MISSING_WATCHED_DATE_ADDED', dialog.serviceId, {
				items: dialog.items,
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
		<Dialog
			classes={{ paper: 'missing-watched-date-dialog' }}
			open={dialog.isOpen}
			aria-labelledby="missing-watched-date-item-dialog-title"
			onClose={closeDialog}
		>
			<DialogTitle id="missing-watched-date-item-dialog-title">
				{I18N.translate('missingWatchedDate')}
			</DialogTitle>
			{dialog.isLoading || dialog.items.length === 0 ? (
				<UtsCenter>
					<CircularProgress />
				</UtsCenter>
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
							<MuiPickersUtilsProvider utils={MomentUtils}>
								<KeyboardDateTimePicker
									label={dateLabel}
									invalidDateMessage={invalidDateLabel}
									maxDateMessage={invalidDateLabel}
									minDateMessage={invalidDateLabel}
									value={dialog.date}
									ampm={false}
									autoOk
									disableFuture
									format="YYYY/MM/DD HH:mm"
									margin="normal"
									KeyboardButtonProps={{ 'aria-label': dateLabel }}
									onChange={onDateChange}
									onAccept={onDateAccept}
									onError={onDateError}
								/>
							</MuiPickersUtilsProvider>
						)}
					</DialogContent>
					<DialogActions>
						<Button color="default" onClick={closeDialog}>
							{I18N.translate('cancel')}
						</Button>
						<Button
							color="primary"
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
		</Dialog>
	);
};
