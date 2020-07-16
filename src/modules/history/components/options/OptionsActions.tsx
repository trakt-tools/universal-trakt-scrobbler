import { Box, Button, Divider } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { BrowserStorage } from '../../../../services/BrowserStorage';
import { Errors } from '../../../../services/Errors';
import { EventDispatcher, Events } from '../../../../services/Events';

export const OptionsActions: React.FC = () => {
	const [cacheSize, setCacheSize] = useState('0 B');

	const updateTraktCacheSize = async () => {
		setCacheSize(await BrowserStorage.getSize('traktCache'));
	};

	const onClearStorageClick = async () => {
		await EventDispatcher.dispatch(Events.DIALOG_SHOW, null, {
			title: browser.i18n.getMessage('confirmClearStorageTitle'),
			message: browser.i18n.getMessage('confirmClearStorageMessage'),
			onConfirm: async () => {
				try {
					await BrowserStorage.clear(true);
					await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, null, {
						messageName: 'clearStorageSuccess',
						severity: 'success',
					});
					await EventDispatcher.dispatch(Events.OPTIONS_CLEAR, null, {});
					await EventDispatcher.dispatch(Events.LOGOUT_SUCCESS, null, {});
					void updateTraktCacheSize();
				} catch (err) {
					Errors.error('Failed to clear storage.', err);
					await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, null, {
						messageName: 'clearStorageFailed',
						severity: 'error',
					});
				}
			},
		});
	};

	const onClearTraktCacheClick = async () => {
		await EventDispatcher.dispatch(Events.DIALOG_SHOW, null, {
			title: browser.i18n.getMessage('confirmClearTraktCacheTitle'),
			message: browser.i18n.getMessage('confirmClearTraktCacheMessage'),
			onConfirm: async () => {
				try {
					await BrowserStorage.remove('traktCache');
					await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, null, {
						messageName: 'clearTraktCacheSuccess',
						severity: 'success',
					});
					void updateTraktCacheSize();
				} catch (err) {
					Errors.error('Failed to clear Trakt cache.', err);
					await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, null, {
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
					{browser.i18n.getMessage('clearStorage')}
				</Button>
				<Button onClick={onClearTraktCacheClick} variant="contained">
					{browser.i18n.getMessage('clearTraktCache')} (<span>{cacheSize}</span>)
				</Button>
			</Box>
		</Box>
	);
};
