import { CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { UtsCenter } from '../../../components/UtsCenter';
import { BrowserStorage, Options, StorageValuesOptions } from '../../../services/BrowserStorage';
import { Errors } from '../../../services/Errors';
import { EventDispatcher, Events, OptionEventData } from '../../../services/Events';
import { OptionsActions } from '../components/options/OptionsActions';
import { OptionsList } from '../components/options/OptionsList';

interface ContentProps {
	isLoading: boolean;
	options: Options;
}

const OptionsPage: React.FC = () => {
	const [content, setContent] = useState<ContentProps>({
		isLoading: true,
		options: {},
	});

	async function resetOptions() {
		setContent({
			isLoading: false,
			options: await BrowserStorage.getOptions(),
		});
	}

	useEffect(() => {
		function startListeners() {
			EventDispatcher.subscribe(Events.OPTIONS_CLEAR, resetOptions);
			EventDispatcher.subscribe(Events.OPTIONS_CHANGE, onOptionChange);
		}

		function stopListeners() {
			EventDispatcher.unsubscribe(Events.OPTIONS_CLEAR, resetOptions);
			EventDispatcher.unsubscribe(Events.OPTIONS_CHANGE, onOptionChange);
		}

		function onOptionChange(data: OptionEventData) {
			const optionsToSave = {} as StorageValuesOptions;
			const options = {
				...content.options,
				[data.id]: {
					...content.options[data.id],
					value: data.checked,
				},
			};
			for (const option of Object.values(options)) {
				optionsToSave[option.id] = option.value;
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
			BrowserStorage.set({ options: optionsToSave }, true)
				.then(async () => {
					setContent({
						isLoading: false,
						options,
					});
					await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
						messageName: 'saveOptionSuccess',
						severity: 'success',
					});
				})
				.catch(async (err) => {
					Errors.error('Failed to save option.', err);
					await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
						messageName: 'saveOptionFailed',
						severity: 'error',
					});
				});
		}

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

export { OptionsPage };
