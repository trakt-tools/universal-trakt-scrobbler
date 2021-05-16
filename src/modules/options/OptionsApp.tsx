import { CircularProgress, Container } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
	BrowserStorage,
	StorageValuesOptions,
	StreamingServiceValue,
} from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import {
	EventDispatcher,
	OptionsChangeData,
	StreamingServiceOptionsChangeData,
} from '../../common/Events';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { UtsCenter } from '../../components/UtsCenter';
import { UtsDialog } from '../../components/UtsDialog';
import { UtsSnackbar } from '../../components/UtsSnackbar';
import { StreamingServiceId, streamingServices } from '../../streaming-services/streaming-services';
import { OptionsActions } from './components/OptionsActions';
import { OptionsHeader } from './components/OptionsHeader';
import { OptionsList } from './components/OptionsList';

export const OptionsApp: React.FC = () => {
	const [content, setContent] = useState({
		isLoading: true,
		optionsChanged: {},
	});

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('OPTIONS_CLEAR', null, resetOptions);
			EventDispatcher.subscribe('OPTIONS_CHANGE', null, onOptionChange);
			EventDispatcher.subscribe(
				'STREAMING_SERVICE_OPTIONS_CHANGE',
				null,
				onStreamingServiceOptionChange
			);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('OPTIONS_CLEAR', null, resetOptions);
			EventDispatcher.unsubscribe('OPTIONS_CHANGE', null, onOptionChange);
			EventDispatcher.unsubscribe(
				'STREAMING_SERVICE_OPTIONS_CHANGE',
				null,
				onStreamingServiceOptionChange
			);
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

		const onStreamingServiceOptionChange = (
			data: StreamingServiceOptionsChangeData<StreamingServiceId>
		) => {
			const streamingServiceValues = {} as Record<StreamingServiceId, StreamingServiceValue>;
			for (const [id, value] of Object.entries(BrowserStorage.options.streamingServices) as [
				StreamingServiceId,
				StreamingServiceValue
			][]) {
				streamingServiceValues[id] = { ...value };
			}
			const originsToAdd = [];
			const originsToRemove = [];
			for (const { id, value: partialValue } of data) {
				const service = streamingServices[id];
				const value = {
					...streamingServiceValues[id],
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
				streamingServiceValues[id] = value;
			}
			const scrobblerEnabled = (Object.entries(streamingServiceValues) as [
				StreamingServiceId,
				StreamingServiceValue
			][]).some(
				([streamingServiceId, value]) =>
					streamingServices[streamingServiceId].hasScrobbler && value.scrobble
			);
			const permissionPromises: Promise<boolean>[] = [];
			if (originsToAdd.length > 0) {
				permissionPromises.push(
					browser.permissions.request({
						permissions: scrobblerEnabled ? ['tabs', 'webNavigation'] : [],
						origins: originsToAdd,
					})
				);
			}
			if (originsToRemove.length > 0) {
				permissionPromises.push(
					browser.permissions.remove({
						permissions: scrobblerEnabled ? [] : ['tabs', 'webNavigation'],
						origins: originsToRemove,
					})
				);
			}
			if (permissionPromises.length > 0) {
				Promise.all(permissionPromises)
					.then((isSuccessArr) => {
						if (isSuccessArr.every((isSuccess) => isSuccess)) {
							void saveOption({
								id: 'streamingServices',
								value: streamingServiceValues,
							});
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
				void saveOption({
					id: 'streamingServices',
					value: streamingServiceValues,
				});
			}
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

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const init = async () => {
			await BrowserStorage.init();
			if (BrowserStorage.options.allowRollbar) {
				Errors.startRollbar();
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
