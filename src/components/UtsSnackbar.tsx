import { Snackbar } from '@material-ui/core';
import { Alert, Color } from '@material-ui/lab';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { EventDispatcher, SnackbarShowData } from '../common/Events';

interface SnackBarState {
	isOpen: boolean;
	message: string;
	severity: Color;
}

export const UtsSnackbar: React.FC = () => {
	const [snackbar, setSnackbar] = useState<SnackBarState>({
		isOpen: false,
		message: '',
		severity: 'info',
	});

	const closeSnackbar = () => {
		setSnackbar((prevSnackbar) => ({
			...prevSnackbar,
			isOpen: false,
		}));
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SNACKBAR_SHOW', null, showSnackbar);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SNACKBAR_SHOW', null, showSnackbar);
		};

		const showSnackbar = (data: SnackbarShowData) => {
			setSnackbar({
				isOpen: true,
				message: browser.i18n.getMessage(data.messageName, data.messageArgs || []),
				severity: data.severity,
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<Snackbar autoHideDuration={3000} onClose={closeSnackbar} open={snackbar.isOpen}>
			<Alert elevation={6} severity={snackbar.severity} variant="filled">
				{snackbar.message}
			</Alert>
		</Snackbar>
	);
};
