import { TraktSettings } from '@apis/TraktSettings';
import { BrowserStorage, StorageValuesOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher } from '@common/Events';
import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { OptionsActions } from '@components/OptionsActions';
import { OptionsHeader } from '@components/OptionsHeader';
import { OptionsList } from '@components/OptionsList';
import { UtsCenter } from '@components/UtsCenter';
import { UtsDialog } from '@components/UtsDialog';
import { UtsSnackbar } from '@components/UtsSnackbar';
import { CircularProgress, Container } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { PartialDeep } from 'type-fest';

export const OptionsApp: React.FC = () => {
	const [content, setContent] = useState({
		isLoading: true,
		optionsChanged: {},
	});

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('OPTIONS_CHANGE', null, onOptionsChange);
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('OPTIONS_CHANGE', null, onOptionsChange);
			EventDispatcher.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const onOptionsChange = (partialOptions: PartialDeep<StorageValuesOptions>) => {
			return BrowserStorage.saveOptions(partialOptions)
				.then(async () => {
					setContent({
						isLoading: false,
						optionsChanged: {},
					});
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveOptionSuccess',
						severity: 'success',
					});
				})
				.catch(async (err) => {
					Errors.error('Failed to save option.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveOptionFailed',
						severity: 'error',
					});
					throw err;
				});
		};

		const onStorageOptionsChange = () => {
			setContent({
				isLoading: false,
				optionsChanged: {},
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const init = async () => {
			await Session.checkLogin();
			if (Session.isLoggedIn) {
				Shared.dateFormat = await TraktSettings.getTimeAndDateFormat();
			}
			setContent({
				isLoading: false,
				optionsChanged: {},
			});
		};

		void init();
	}, []);

	return (
		<ErrorBoundary>
			<OptionsHeader />
			<Container className="options-container">
				{content.isLoading ? (
					<UtsCenter>
						<CircularProgress />
					</UtsCenter>
				) : (
					<>
						<OptionsList />
						<OptionsActions />

						<UtsDialog />
						<UtsSnackbar />
					</>
				)}
			</Container>
		</ErrorBoundary>
	);
};
