import { CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { UtsCenter } from '../../../components/UtsCenter';
import {
	BrowserStorage,
	Option,
	Options,
	StorageValuesOptions,
} from '../../../services/BrowserStorage';
import { Errors } from '../../../services/Errors';
import {
	EventDispatcher,
	Events,
	OptionEventData,
	StreamingServiceOptionEventData,
} from '../../../services/Events';
import { StreamingServiceId, streamingServices } from '../../../streaming-services';
import { OptionsActions } from '../components/options/OptionsActions';
import { OptionsList } from '../components/options/OptionsList';

interface ContentProps {
	isLoading: boolean;
	options: Options;
}

export const OptionsPage: React.FC = () => {
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
			EventDispatcher.subscribe(Events.OPTIONS_CLEAR, null, resetOptions);
			EventDispatcher.subscribe(Events.OPTIONS_CHANGE, null, onOptionChange);
			EventDispatcher.subscribe(
				Events.STREAMING_SERVICE_OPTIONS_CHANGE,
				null,
				onStreamingServiceOptionChange
			);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe(Events.OPTIONS_CLEAR, null, resetOptions);
			EventDispatcher.unsubscribe(Events.OPTIONS_CHANGE, null, onOptionChange);
			EventDispatcher.unsubscribe(
				Events.STREAMING_SERVICE_OPTIONS_CHANGE,
				null,
				onStreamingServiceOptionChange
			);
		};

		const onOptionChange = (data: OptionEventData<keyof StorageValuesOptions>) => {
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
						await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
							messageName: 'saveOptionFailed',
							severity: 'error',
						});
					});
			} else {
				void saveOptions(optionsToSave, options);
			}
		};

		const onStreamingServiceOptionChange = (
			data: StreamingServiceOptionEventData<StreamingServiceId>
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
				options.streamingServices.value[dataOption.id] = dataOption.value;
				const service = streamingServices[dataOption.id];
				if (dataOption.value) {
					originsToAdd.push(...service.hostPatterns);
				} else {
					originsToRemove.push(...service.hostPatterns);
				}
			}
			for (const option of Object.values(options)) {
				addOptionToSave(optionsToSave, option);
			}
			const permissionPromises: Promise<boolean>[] = [];
			if (originsToAdd.length > 0) {
				permissionPromises.push(
					browser.permissions.request({
						permissions: [],
						origins: originsToAdd,
					})
				);
			}
			if (originsToRemove.length > 0) {
				permissionPromises.push(
					browser.permissions.remove({
						permissions: [],
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
						await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
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
				await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, null, {
					messageName: 'saveOptionSuccess',
					severity: 'success',
				});
			} catch (err) {
				Errors.error('Failed to save option.', err);
				await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, null, {
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

	return content.isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<>
			<OptionsList options={Object.values(content.options)} />
			<OptionsActions />
		</>
	);
};
