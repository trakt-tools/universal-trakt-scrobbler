import { BrowserStorage } from '@common/BrowserStorage';
import { Cache } from '@common/Cache';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Box, Button, Divider } from '@mui/material';
import React, { useEffect, useState } from 'react';

export const OptionsActions: React.FC = () => {
	const [cacheSize, setCacheSize] = useState('0 B');

	const updateCachesSize = async () => {
		setCacheSize(await BrowserStorage.getSize(Cache.storageKeys));
	};

	const onClearStorageClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearStorageTitle'),
			message: I18N.translate('confirmClearStorageMessage'),
			onConfirm: async () => {
				try {
					await BrowserStorage.clear(true);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearStorageSuccess',
						severity: 'success',
					});
					await EventDispatcher.dispatch('LOGOUT_SUCCESS', null, {});
					void updateCachesSize();
				} catch (err) {
					Errors.error('Failed to clear storage.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearStorageFailed',
						severity: 'error',
					});
				}
			},
		});
	};

	const onClearCachesClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearCachesTitle'),
			message: I18N.translate('confirmClearCachesMessage'),
			onConfirm: async () => {
				try {
					await BrowserStorage.remove(Cache.storageKeys);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearCachesSuccess',
						severity: 'success',
					});
					void updateCachesSize();
				} catch (err) {
					Errors.error('Failed to clear caches.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearCachesFailed',
						severity: 'error',
					});
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
				<Button onClick={onClearStorageClick} variant="contained">
					{I18N.translate('clearStorage')}
				</Button>
				<Button onClick={onClearCachesClick} variant="contained">
					{I18N.translate('clearCaches')} (<Box component="span">{cacheSize}</Box>)
				</Button>
			</Box>
		</Box>
	);
};
