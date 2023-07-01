import { TraktSync } from '@apis/TraktSync';
import { SyncDialogShowData, SyncProgressData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Center } from '@components/Center';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import { ScrobbleItem } from '@models/Item';
import {
	Box,
	Button,
	CircularProgress,
	DialogActions,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Typography,
} from '@mui/material';
import { SyncStore } from '@stores/SyncStore';
import { useEffect, useState } from 'react';

interface SyncDialogState extends SyncDialogShowData {
	isOpen: boolean;
	message: string;
	percentage?: number | null;
}

export const SyncDialog = (): JSX.Element => {
	const [dialog, setDialog] = useState<SyncDialogState>({
		serviceId: null,
		isOpen: false,
		message: '',
	});

	const closeDialog = (): void => {
		setDialog({
			serviceId: null,
			isOpen: false,
			message: '',
		});
	};

	const cancelSync = async () => {
		await Shared.events.dispatch('REQUESTS_CANCEL', null, {
			tabId: Shared.tabId,
			key: dialog.isAutoSync ? 'autoSync' : 'sync',
		});
		closeDialog();
	};

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('SYNC_DIALOG_SHOW', null, openDialog);
			Shared.events.subscribe('SYNC_DIALOG_HIDE', null, closeDialog);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('SYNC_DIALOG_SHOW', null, openDialog);
			Shared.events.unsubscribe('SYNC_DIALOG_HIDE', null, closeDialog);
		};

		const openDialog = (data: SyncDialogShowData) => {
			setDialog({
				...data,
				isOpen: true,
				message: '',
			});
			if (data.store && data.items) {
				void startSync(data.store, data.serviceId, data.items);
			}
		};

		const startSync = async (store: SyncStore, serviceId: string | null, items: ScrobbleItem[]) => {
			if (!store || items.length === 0) {
				closeDialog();
				return;
			}

			try {
				await TraktSync.sync(store, items);
				if (serviceId) {
					const lastSync = items[0].watchedAt ?? Utils.unix();
					if (lastSync > Shared.storage.options.services[serviceId].lastSync) {
						await Shared.storage.saveOptions({
							services: {
								[serviceId]: {
									lastSync,
									lastSyncId: items[0].id,
								},
							},
						});
					}
				} else {
					await Shared.storage.remove('syncCache');
					await store.resetData();
				}
			} catch (err) {
				// Do nothing
			}

			closeDialog();
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('SYNC_PROGRESS', dialog.serviceId, onSyncProgress);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('SYNC_PROGRESS', dialog.serviceId, onSyncProgress);
		};

		const onSyncProgress = (data: SyncProgressData) => {
			setDialog((prevDialog) => ({
				...prevDialog,
				percentage: null,
				...data,
			}));
		};

		startListeners();
		return stopListeners;
	}, [dialog.serviceId]);

	return (
		<CustomDialogRoot
			open={dialog.isOpen}
			aria-labelledby="sync-dialog-title"
			onClose={() => {
				// Do nothing
			}}
		>
			<DialogTitle id="sync-dialog-title">{I18N.translate('syncing')}</DialogTitle>
			<DialogContent>
				<Center
					isHorizontal={false}
					sx={{
						gap: 2,
					}}
				>
					<CircularProgress />
					{dialog.message}
					{dialog.percentage && (
						<Box
							sx={{
								display: 'flex',
								gap: 2,
								alignItems: 'center',
								width: 1,
							}}
						>
							<Box
								sx={{
									flex: 1,
								}}
							>
								<LinearProgress variant="determinate" value={dialog.percentage} />
							</Box>
							<Typography variant="overline">{`${dialog.percentage}%`}</Typography>
						</Box>
					)}
				</Center>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => void cancelSync()}>{I18N.translate('cancel')}</Button>
			</DialogActions>
		</CustomDialogRoot>
	);
};
