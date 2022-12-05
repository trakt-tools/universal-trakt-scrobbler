import { Cache } from '@common/Cache';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Box, Button, Divider } from '@mui/material';
import { useEffect, useState } from 'react';

export const OptionsActions = (): JSX.Element => {
	const [cacheSize, setCacheSize] = useState('0 B');

	const updateCachesSize = async () => {
		setCacheSize(await Shared.storage.getSize(Cache.storageKeys));
	};

	const onClearStorageClick = async () => {
		await Shared.events.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearStorageTitle'),
			message: I18N.translate('confirmClearStorageMessage'),
			onConfirm: async () => {
				try {
					await Shared.storage.clear(true);
					await Shared.events.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearStorageSuccess',
						severity: 'success',
					});
					await Shared.events.dispatch('LOGOUT_SUCCESS', null, {});
					void updateCachesSize();
				} catch (err) {
					if (Shared.errors.validate(err)) {
						Shared.errors.error('Failed to clear storage.', err);
						await Shared.events.dispatch('SNACKBAR_SHOW', null, {
							messageName: 'clearStorageFailed',
							severity: 'error',
						});
					}
				}
			},
		});
	};

	const onClearCachesClick = async () => {
		await Shared.events.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearCachesTitle'),
			message: I18N.translate('confirmClearCachesMessage'),
			onConfirm: async () => {
				try {
					await Shared.storage.remove(Cache.storageKeys);
					await Shared.events.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearCachesSuccess',
						severity: 'success',
					});
					void updateCachesSize();
				} catch (err) {
					if (Shared.errors.validate(err)) {
						Shared.errors.error('Failed to clear caches.', err);
						await Shared.events.dispatch('SNACKBAR_SHOW', null, {
							messageName: 'clearCachesFailed',
							severity: 'error',
						});
					}
				}
			},
		});
	};

	useEffect(() => {
		void updateCachesSize();
	}, []);

	return (
		<Box
			sx={{
				position: 'fixed',
				right: 0,
				bottom: 0,
				left: 0,
				backgroundColor: '#fff',
			}}
		>
			<Divider />
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					padding: 2,

					'& > *': {
						marginY: 0,
						marginX: 1,
					},
				}}
			>
				<Button onClick={() => void onClearStorageClick()} variant="contained">
					{I18N.translate('clearStorage')}
				</Button>
				<Button onClick={() => void onClearCachesClick()} variant="contained">
					{I18N.translate('clearCaches')} (<Box component="span">{cacheSize}</Box>)
				</Button>
			</Box>
		</Box>
	);
};
