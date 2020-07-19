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
import { Item } from '../models/Item';
import { StreamingServiceId } from '../streaming-services/streaming-services';
import { UtsCenter } from './UtsCenter';

interface MissingWatchedDateDialogState {
	isOpen: boolean;
	isLoading: boolean;
	serviceId?: StreamingServiceId;
	item?: Item;
	dateType: MissingWatchedDateType | null;
	date: moment.Moment | null;
	dateError: React.ReactNode | null;
}

export type MissingWatchedDateType = 'release-date' | 'current-date' | 'custom-date';

export const MissingWatchedDateDialog: React.FC = () => {
	const [dialog, setDialog] = React.useState<MissingWatchedDateDialogState>({
		isOpen: false,
		isLoading: false,
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
			if (!dialog.serviceId || !dialog.item) {
				throw new Error('Missing service ID or item');
			}
			if (
				!dialog.dateType ||
				(dialog.dateType === 'custom-date' && (!dialog.date || !!dialog.dateError))
			) {
				throw new Error('Missing date type or invalid date');
			}
			await EventDispatcher.dispatch('MISSING_WATCHED_DATE_ADDED', dialog.serviceId, {
				item: dialog.item,
				dateType: dialog.dateType,
				date: dialog.date,
			});
		} catch (err) {
			Errors.error('Failed to add missing watched date.', err);
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'addMissingWatchedDateFailed',
				severity: 'error',
			});
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

	const dateLabel = browser.i18n.getMessage('missingWatchedDateDialogDateLabel');
	const invalidDateLabel = browser.i18n.getMessage('missingWatchedDateDialogInvalidDateLabel');

	return (
		<Dialog
			classes={{ paper: 'missing-watched-date-dialog' }}
			open={dialog.isOpen}
			aria-labelledby="missing-watched-date-item-dialog-title"
			onClose={closeDialog}
		>
			<DialogTitle id="missing-watched-date-item-dialog-title">
				{browser.i18n.getMessage('missingWatchedDate')}
			</DialogTitle>
			{dialog.isLoading ? (
				<UtsCenter>
					<CircularProgress />
				</UtsCenter>
			) : (
				<>
					<DialogContent>
						<DialogContentText>
							{browser.i18n.getMessage(
								'missingWatchedDateDialogContent',
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
						<RadioGroup
							name="date-type"
							value={dialog.dateType}
							aria-label="date-type"
							onChange={onDateTypeChange}
						>
							<FormControlLabel
								label={browser.i18n.getMessage('useReleaseDate')}
								value="release-date"
								control={<Radio />}
							/>
							<FormControlLabel
								label={browser.i18n.getMessage('useCurrentDate')}
								value="current-date"
								control={<Radio />}
							/>
							<FormControlLabel
								label={browser.i18n.getMessage('useCustomDate')}
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
							{browser.i18n.getMessage('cancel')}
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
							{browser.i18n.getMessage('add')}
						</Button>
					</DialogActions>
				</>
			)}
		</Dialog>
	);
};
