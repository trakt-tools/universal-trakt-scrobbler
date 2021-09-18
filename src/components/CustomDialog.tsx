import { DialogShowData, EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import {
	Button,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface DialogState extends DialogShowData {
	isOpen: boolean;
}

export const CustomDialog = (): JSX.Element => {
	const [dialog, setDialog] = useState<DialogState>({
		isOpen: false,
		title: '',
		message: '',
	});

	const closeDialog = (didConfirm: boolean) => {
		const callback = didConfirm ? dialog.onConfirm : dialog.onDeny;
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
		if (callback) {
			callback();
		}
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('DIALOG_SHOW', null, showDialog);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('DIALOG_SHOW', null, showDialog);
		};

		const showDialog = (data: DialogShowData) => {
			setDialog({
				isOpen: true,
				title: data.title,
				message: data.message,
				onConfirm: data.onConfirm,
				onDeny: data.onDeny,
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<CustomDialogRoot onClose={() => closeDialog(false)} open={dialog.isOpen}>
			<DialogTitle>{dialog.title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{dialog.message}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => closeDialog(false)}>
					{I18N.translate(dialog.onConfirm || dialog.onDeny ? 'no' : 'close')}
				</Button>
				{dialog.onConfirm && (
					<Button onClick={() => closeDialog(true)} variant="contained">
						{I18N.translate('yes')}
					</Button>
				)}
			</DialogActions>
		</CustomDialogRoot>
	);
};
