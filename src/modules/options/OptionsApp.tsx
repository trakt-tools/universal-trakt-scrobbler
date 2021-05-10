import { CircularProgress, Container } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
	BrowserStorage,
	Option,
	Options,
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

interface ContentProps {
	isLoading: boolean;
	options: Options;
}

export const OptionsApp: React.FC = () => {
	const [content, setContent] = useState<ContentProps>({
		isLoading: true,
		options: {} as Options,
	});

	const resetOptions = async () => {
		setContent({
			isLoading: false,
			options: await BrowserStorage.getOptions(),
		});
	};

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

		const onOptionChange = (data: OptionsChangeData<keyof StorageValuesOptions>) => {
			const optionsToSave = {} as StorageValuesOptions;
			const options = {
				...content.options,
				[data.id]: {
					...content.options[data.id],
					value: data.value,
				},
			};
			for (const option of Object.values(options)) {
				addOptionToSave(optionsToSave, option);
			}
			let permissionPromise: Promise<boolean> | undefined;
			const option = options[data.id];
			if (option.permissions || option.origins) {
				if (option.value) {
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
							void saveOptions(optionsToSave, options);
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
				void saveOptions(optionsToSave, options);
			}
		};

		const onStreamingServiceOptionChange = (
			data: StreamingServiceOptionsChangeData<StreamingServiceId>
		) => {
			const optionsToSave = {} as StorageValuesOptions;
			const options = {
				...content.options,
				streamingServices: {
					...content.options.streamingServices,
					value: {
						...content.options.streamingServices.value,
					},
				},
			};
			const originsToAdd = [];
			const originsToRemove = [];
			for (const dataOption of data) {
				const service = streamingServices[dataOption.id];
				const streamingServiceValue = {
					...options.streamingServices.value[dataOption.id],
					...dataOption.value,
				};
				if (streamingServiceValue.scrobble && !service.hasScrobbler) {
					streamingServiceValue.scrobble = false;
				}
				if (streamingServiceValue.sync && !service.hasSync) {
					streamingServiceValue.sync = false;
				}
				if (streamingServiceValue.scrobble || streamingServiceValue.sync) {
					originsToAdd.push(...service.hostPatterns);
				} else {
					originsToRemove.push(...service.hostPatterns);
				}
				options.streamingServices.value[dataOption.id] = streamingServiceValue;
			}
			for (const option of Object.values(options) as Option<keyof StorageValuesOptions>[]) {
				addOptionToSave(optionsToSave, option);
			}
			const scrobblerEnabled = (Object.entries(optionsToSave.streamingServices) as [
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
							void saveOptions(optionsToSave, options);
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
				void saveOptions(optionsToSave, options);
			}
		};

		const addOptionToSave = <K extends keyof StorageValuesOptions>(
			optionsToSave: StorageValuesOptions,
			option: Option<K>
		) => {
			optionsToSave[option.id] = option.value;
		};

		const saveOptions = async (optionsToSave: StorageValuesOptions, options: Options) => {
			try {
				await BrowserStorage.set({ options: optionsToSave }, true);
				setContent({
					isLoading: false,
					options,
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
	}, [content]);

	useEffect(() => {
		void resetOptions();
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
						<OptionsList options={Object.values(content.options)} />
						<OptionsActions />
					</>
				)}
				<UtsDialog />
				<UtsSnackbar />
			</Container>
		</ErrorBoundary>
	);
};
