import { BrowserStorage } from '@common/BrowserStorage';
import { Cache } from '@common/Cache';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Box, Button, Divider } from '@material-ui/core';
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
		<Box className="options-actions--container">
			<Divider />
			<Box className="options-actions">
				<Button onClick={onClearStorageClick} variant="contained">
					{I18N.translate('clearStorage')}
				</Button>
				<Button onClick={onClearCachesClick} variant="contained">
					{I18N.translate('clearCaches')} (<span>{cacheSize}</span>)
				</Button>
			</Box>
		</Box>
	);
};
