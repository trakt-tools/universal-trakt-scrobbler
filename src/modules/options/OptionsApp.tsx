import { TraktSettings } from '@apis/TraktSettings';
import { BrowserStorage, ServiceValue, StorageValuesOptions } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import { EventDispatcher, OptionsChangeData, ServiceOptionsChangeData } from '@common/Events';
import { Messaging } from '@common/Messaging';
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
import { getService } from '@models/Service';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';

export const OptionsApp: React.FC = () => {
	const [content, setContent] = useState({
		isLoading: true,
		optionsChanged: {},
	});

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('OPTIONS_CLEAR', null, resetOptions);
			EventDispatcher.subscribe('OPTIONS_CHANGE', null, onOptionChange);
			EventDispatcher.subscribe('SERVICE_OPTIONS_CHANGE', null, onServiceOptionChange);
			EventDispatcher.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('OPTIONS_CLEAR', null, resetOptions);
			EventDispatcher.unsubscribe('OPTIONS_CHANGE', null, onOptionChange);
			EventDispatcher.unsubscribe('SERVICE_OPTIONS_CHANGE', null, onServiceOptionChange);
			EventDispatcher.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const resetOptions = () => {
			setContent({
				isLoading: false,
				optionsChanged: {},
			});
		};

		const onOptionChange = (data: OptionsChangeData<keyof StorageValuesOptions>) => {
			let permissionPromise: Promise<boolean> | undefined;
			const option = BrowserStorage.optionsDetails[data.id];
			if (option.permissions || option.origins) {
				if (data.value) {
					permissionPromise = browser.permissions.request({
						permissions: option.permissions || [],
						origins: option.origins || [],
					});
				} else {
					permissionPromise = browser.permissions.remove({
						permissions: option.permissions || [],
						origins: option.origins || [],
					});
				}
			}
			if (permissionPromise) {
				permissionPromise
					.then((isSuccess) => {
						if (isSuccess) {
							void saveOption(data);
						}
					})
					.catch(async (err) => {
						Errors.error('Failed to save option.', err);
						await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
							messageName: 'saveOptionFailed',
							severity: 'error',
						});
					});
			} else {
				void saveOption(data);
			}
		};

		const onServiceOptionChange = (data: ServiceOptionsChangeData) => {
			const serviceValues = {} as Record<string, ServiceValue>;
			for (const [id, value] of Object.entries(BrowserStorage.options.services)) {
				serviceValues[id] = { ...value };
			}
			const originsToAdd = [];
			const originsToRemove = [];
			for (const { id, value: partialValue } of data) {
				const service = getService(id);
				const value = {
					...serviceValues[id],
					...partialValue,
				};
				if (value.scrobble && !service.hasScrobbler) {
					value.scrobble = false;
				}
				if (value.sync && !service.hasSync) {
					value.sync = false;
				}
				if (value.autoSync && (!service.hasSync || !service.hasAutoSync || !value.sync)) {
					value.autoSync = false;
				}
				if (value.scrobble || value.sync) {
					originsToAdd.push(...service.hostPatterns);
				} else {
					originsToRemove.push(...service.hostPatterns);
				}
				serviceValues[id] = value;
			}
			const scrobblerEnabled = Object.entries(serviceValues).some(
				([serviceId, value]) => getService(serviceId).hasScrobbler && value.scrobble
			);
			const permissionPromises: Promise<boolean>[] = [];
			if (originsToAdd.length > 0) {
				permissionPromises.push(
					browser.permissions.request({
						permissions: scrobblerEnabled ? ['tabs'] : [],
						origins: originsToAdd,
					})
				);
			}
			if (originsToRemove.length > 0) {
				permissionPromises.push(
					browser.permissions.remove({
						permissions: scrobblerEnabled ? [] : ['tabs'],
						origins: originsToRemove,
					})
				);
			}
			if (permissionPromises.length === 0) {
				permissionPromises.push(Promise.resolve(true));
			}
			Promise.all(permissionPromises)
				.then(async (isSuccessArr) => {
					if (isSuccessArr.every((isSuccess) => isSuccess)) {
						await saveOption({
							id: 'services',
							value: serviceValues,
						});
						if (
							data.some(
								(dataItem) => 'autoSync' in dataItem.value || 'autoSyncDays' in dataItem.value
							)
						) {
							await Messaging.toBackground({ action: 'check-auto-sync' });
						}
					}
				})
				.catch(async (err) => {
					Errors.error('Failed to save option.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveOptionFailed',
						severity: 'error',
					});
				});
		};

		const saveOption = async (data: OptionsChangeData<keyof StorageValuesOptions>) => {
			try {
				await BrowserStorage.saveOptions({ [data.id]: data.value });
				setContent({
					isLoading: false,
					optionsChanged: {},
				});
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'saveOptionSuccess',
					severity: 'success',
				});
			} catch (err) {
				Errors.error('Failed to save option.', err);
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'saveOptionFailed',
					severity: 'error',
				});
			}
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
			await BrowserStorage.init();
			if (BrowserStorage.options.allowRollbar) {
				Errors.startRollbar();
			}
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
