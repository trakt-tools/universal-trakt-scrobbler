import { TraktSync } from '@apis/TraktSync';
import { SyncDialogShowData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Center } from '@components/Center';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import { ScrobbleItem } from '@models/Item';
import { Button, CircularProgress, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { SyncStore } from '@stores/SyncStore';
import { useEffect, useState } from 'react';

export const SyncDialog = (): JSX.Element => {
	const [isOpen, setOpen] = useState(false);

	const closeDialog = (): void => {
		setOpen(false);
	};

	const cancelSync = async () => {
		await Shared.events.dispatch('REQUESTS_CANCEL', null, {
			tabId: Shared.tabId,
			key: 'sync',
		});
		closeDialog();
	};

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('SYNC_DIALOG_SHOW', null, openDialog);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('SYNC_DIALOG_SHOW', null, openDialog);
		};

		const openDialog = (data: SyncDialogShowData) => {
			setOpen(true);
			void startSync(data.store, data.serviceId, data.items);
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

	return (
		<CustomDialogRoot
			open={isOpen}
			aria-labelledby="sync-dialog-title"
			onClose={() => {
				// Do nothing
			}}
		>
			<DialogTitle id="sync-dialog-title">{I18N.translate('syncing')}</DialogTitle>
			<DialogContent>
				<Center>
					<CircularProgress />
				</Center>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => void cancelSync()}>{I18N.translate('cancel')}</Button>
			</DialogActions>
		</CustomDialogRoot>
	);
};
