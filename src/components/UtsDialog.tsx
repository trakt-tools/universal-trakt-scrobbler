import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { EventDispatcher, Events } from '../services/Events';

interface DialogData {
	title: string;
	message: string;
	onConfirm?: () => void;
	onDeny?: () => void;
}

interface DialogState extends DialogData {
	isOpen: boolean;
}

export const UtsDialog: React.FC = () => {
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
			EventDispatcher.subscribe(Events.DIALOG_SHOW, null, showDialog);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe(Events.DIALOG_SHOW, null, showDialog);
		};

		const showDialog = (data: DialogData) => {
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
		<Dialog onClose={() => closeDialog(false)} open={dialog.isOpen}>
			<DialogTitle>{dialog.title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{dialog.message}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button color="primary" onClick={() => closeDialog(false)}>
					{browser.i18n.getMessage('no')}
				</Button>
				<Button color="primary" onClick={() => closeDialog(true)} variant="contained">
					{browser.i18n.getMessage('yes')}
				</Button>
			</DialogActions>
		</Dialog>
	);
};
