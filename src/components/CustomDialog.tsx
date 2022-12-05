import { DialogShowData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
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

export type DialogCloseReason = 'escapeKeyDown' | 'backdropClick' | 'user';

export const CustomDialog = (): JSX.Element => {
	const [dialog, setDialog] = useState<DialogState>({
		isOpen: false,
		title: '',
		message: '',
	});

	const closeDialog = (reason: DialogCloseReason, didConfirm: boolean) => {
		let callback;
		if (didConfirm) {
			callback = dialog.onConfirm;
		} else if (reason === 'user') {
			callback = dialog.onDeny;
		}
		setDialog((prevDialog) => ({
			...prevDialog,
			isOpen: false,
		}));
		if (callback) {
			void callback();
		}
	};

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('DIALOG_SHOW', null, showDialog);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('DIALOG_SHOW', null, showDialog);
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
		<CustomDialogRoot onClose={(e, reason) => closeDialog(reason, false)} open={dialog.isOpen}>
			<DialogTitle>{dialog.title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{dialog.message}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => closeDialog('user', false)}>
					{I18N.translate(dialog.onConfirm || dialog.onDeny ? 'no' : 'close')}
				</Button>
				{dialog.onConfirm && (
					<Button onClick={() => closeDialog('user', true)} variant="contained">
						{I18N.translate('yes')}
					</Button>
				)}
			</DialogActions>
		</CustomDialogRoot>
	);
};
