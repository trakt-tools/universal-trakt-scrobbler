import { SnackbarShowData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Alert, AlertColor, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';

interface SnackBarState {
	isOpen: boolean;
	message: string;
	severity: AlertColor;
}

export const CustomSnackbar = (): JSX.Element => {
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
			Shared.events.subscribe('SNACKBAR_SHOW', null, showSnackbar);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('SNACKBAR_SHOW', null, showSnackbar);
		};

		const showSnackbar = (data: SnackbarShowData) => {
			const message = I18N.translate(data.messageName, data.messageArgs || []);
			if (snackbar.isOpen && snackbar.message === message) {
				return;
			}
			setSnackbar({
				isOpen: true,
				message,
				severity: data.severity,
			});
		};

		startListeners();
		return stopListeners;
	}, [snackbar]);

	return (
		<Snackbar autoHideDuration={3000} onClose={closeSnackbar} open={snackbar.isOpen}>
			<Alert elevation={6} severity={snackbar.severity} variant="filled">
				{snackbar.message}
			</Alert>
		</Snackbar>
	);
};
