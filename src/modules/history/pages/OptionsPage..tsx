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
			EventDispatcher.subscribe(Events.OPTIONS_CLEAR, resetOptions);
			EventDispatcher.subscribe(Events.OPTIONS_CHANGE, onOptionChange);
			EventDispatcher.subscribe(
				Events.STREAMING_SERVICE_OPTIONS_CHANGE,
				onStreamingServiceOptionChange
			);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe(Events.OPTIONS_CLEAR, resetOptions);
			EventDispatcher.unsubscribe(Events.OPTIONS_CHANGE, onOptionChange);
			EventDispatcher.unsubscribe(
				Events.STREAMING_SERVICE_OPTIONS_CHANGE,
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
			const option = options[data.id];
			if (option.permissions || option.origins) {
				if (option.value) {
					void browser.permissions.request({
						permissions: option.permissions || [],
						origins: option.origins || [],
					});
				} else {
					void browser.permissions.remove({
						permissions: option.permissions || [],
						origins: option.origins || [],
					});
				}
			}
			void saveOptions(optionsToSave, options);
		};

		const onStreamingServiceOptionChange = (
			data: StreamingServiceOptionEventData<StreamingServiceId>
		) => {
			const optionsToSave = {} as StorageValuesOptions;
			const options = { ...content.options };
			const originsToAdd = [];
			const originsToRemove = [];
			for (const dataOption of data) {
				options.streamingServices.value[dataOption.id] = dataOption.value;
				const service = streamingServices[dataOption.id];
				if (dataOption.value) {
					originsToAdd.push(service.hostPattern);
				} else {
					originsToRemove.push(service.hostPattern);
				}
			}
			for (const option of Object.values(options)) {
				addOptionToSave(optionsToSave, option);
			}
			if (originsToAdd.length > 0) {
				void browser.permissions.request({
					permissions: [],
					origins: originsToAdd,
				});
			}
			if (originsToRemove.length > 0) {
				void browser.permissions.remove({
					permissions: [],
					origins: originsToRemove,
				});
			}
			void saveOptions(optionsToSave, options);
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
				await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
					messageName: 'saveOptionSuccess',
					severity: 'success',
				});
			} catch (err) {
				Errors.error('Failed to save option.', err);
				await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
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
