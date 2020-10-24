import { Box, Button, Divider } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { Errors } from '../../../common/Errors';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';

export const OptionsActions: React.FC = () => {
	const [cacheSize, setCacheSize] = useState('0 B');

	const updateTraktCacheSize = async () => {
		setCacheSize(await BrowserStorage.getSize('traktCache'));
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
					await EventDispatcher.dispatch('OPTIONS_CLEAR', null, {});
					await EventDispatcher.dispatch('LOGOUT_SUCCESS', null, {});
					void updateTraktCacheSize();
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

	const onClearTraktCacheClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearTraktCacheTitle'),
			message: I18N.translate('confirmClearTraktCacheMessage'),
			onConfirm: async () => {
				try {
					await BrowserStorage.remove('traktCache');
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearTraktCacheSuccess',
						severity: 'success',
					});
					void updateTraktCacheSize();
				} catch (err) {
					Errors.error('Failed to clear Trakt cache.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'clearTraktCacheFailed',
						severity: 'error',
					});
				}
			},
		});
	};

	useEffect(() => {
		void updateTraktCacheSize();
	}, []);

	return (
		<Box className="options-actions--container">
			<Divider />
			<Box className="options-actions">
				<Button onClick={onClearStorageClick} variant="contained">
					{I18N.translate('clearStorage')}
				</Button>
				<Button onClick={onClearTraktCacheClick} variant="contained">
					{I18N.translate('clearTraktCache')} (<span>{cacheSize}</span>)
				</Button>
			</Box>
		</Box>
	);
};
