import { Box, CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { UtsCenter } from '../../../../components/UtsCenter';
import { BrowserStorage } from '../../../../services/BrowserStorage';
import {
	Events,
	EventDispatcher,
	StreamingServiceStoreUpdateData,
	HistoryOptionsChangeData,
	HistorySyncSuccessData,
} from '../../../../services/Events';
import { HistoryActions } from '../../components/history/HistoryActions';
import { HistoryList } from '../../components/history/HistoryList';
import { HistoryOptionsList } from '../../components/history/HistoryOptionsList';
import { TraktSync } from '../../../../api/TraktSync';
import { Store } from './Store';
import { Item } from '../../../../models/Item';
import { Errors } from '../../../../services/Errors';
import { Api } from './api';
import { TraktSettings } from '../../../../api/TraktSettings';

interface PageProps {
	serviceName: string;
	store: Store;
	api: Api;
}

interface OptionsContent {
	hasLoaded: boolean;
	options: SyncOptions;
}

interface Content {
	isLoading: boolean;
	isLastPage: boolean;
	nextPage: number;
	nextVisualPage: number;
	items: Item[];
}

export const Page: React.FC<PageProps> = ({ serviceName, store, api }) => {
	const [optionsContent, setOptionsContent] = useState<OptionsContent>({
		hasLoaded: false,
		options: {} as SyncOptions,
	});
	const [content, setContent] = useState<Content>({
		isLoading: true,
		isLastPage: false,
		nextPage: 0,
		nextVisualPage: 0,
		items: [],
	});
	const [dateFormat, setDateFormat] = useState('MMMM Do YYYY, H:mm:ss');

	const loadNextPage = () => {
		const itemsToLoad =
			(content.nextVisualPage + 1) * optionsContent.options.itemsPerLoad.value -
			content.items.length;
		if (itemsToLoad > 0) {
			setContent((prevContent) => ({
				...prevContent,
				isLoading: true,
			}));
			api.loadHistory(content.nextPage, content.nextVisualPage, itemsToLoad);
		} else {
			store.update({
				nextVisualPage: content.nextVisualPage + 1,
			});
		}
	};

	const onNextPageClick = () => {
		loadNextPage();
	};

	const onSyncClick = async () => {
		setContent((prevContent) => ({
			...prevContent,
			isLoading: true,
		}));
		await TraktSync.sync(store.data.items, optionsContent.options.addWithReleaseDate.value);
		setContent((prevContent) => ({
			...prevContent,
			isLoading: false,
		}));
	};

	useEffect(() => {
		function startListeners() {
			EventDispatcher.subscribe(Events.STREAMING_SERVICE_STORE_UPDATE, onStoreUpdate);
			EventDispatcher.subscribe(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, onHistoryLoadError);
			EventDispatcher.subscribe(Events.TRAKT_HISTORY_LOAD_ERROR, onTraktHistoryLoadError);
			EventDispatcher.subscribe(Events.HISTORY_SYNC_SUCCESS, onHistorySyncSuccess);
			EventDispatcher.subscribe(Events.HISTORY_SYNC_ERROR, onHistorySyncError);
			store.startListeners();
		}

		const stopListeners = () => {
			EventDispatcher.unsubscribe(Events.STREAMING_SERVICE_STORE_UPDATE, onStoreUpdate);
			EventDispatcher.unsubscribe(Events.STREAMING_SERVICE_HISTORY_LOAD_ERROR, onHistoryLoadError);
			EventDispatcher.unsubscribe(Events.TRAKT_HISTORY_LOAD_ERROR, onTraktHistoryLoadError);
			EventDispatcher.unsubscribe(Events.HISTORY_SYNC_SUCCESS, onHistorySyncSuccess);
			EventDispatcher.unsubscribe(Events.HISTORY_SYNC_ERROR, onHistorySyncError);
			store.stopListeners();
		};

		function onStoreUpdate(data: StreamingServiceStoreUpdateData) {
			setContent({
				isLoading: false,
				...data.data,
			});
		}

		async function onHistoryLoadError() {
			await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
				messageName: 'loadHistoryError',
				severity: 'error',
			});
		}

		async function onTraktHistoryLoadError() {
			await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
				messageName: 'loadTraktHistoryError',
				severity: 'error',
			});
		}

		async function onHistorySyncSuccess(data: HistorySyncSuccessData) {
			await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
				messageArgs: [data.added.episodes.toString(), data.added.movies.toString()],
				messageName: 'historySyncSuccess',
				severity: 'success',
			});
		}

		async function onHistorySyncError() {
			await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
				messageName: 'historySyncError',
				severity: 'error',
			});
		}

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		function startListeners() {
			EventDispatcher.subscribe(Events.HISTORY_OPTIONS_CHANGE, onOptionsChange);
		}

		function stopListeners() {
			EventDispatcher.unsubscribe(Events.HISTORY_OPTIONS_CHANGE, onOptionsChange);
		}

		function onOptionsChange(data: HistoryOptionsChangeData) {
			const optionsToSave = {} as StorageValuesSyncOptions;
			const options = {
				...optionsContent.options,
				[data.id]: {
					...optionsContent.options[data.id],
					value: data.value,
				},
			};
			for (const option of Object.values(options)) {
				// @ts-ignore
				optionsToSave[option.id] = option.value;
			}
			BrowserStorage.set({ syncOptions: optionsToSave }, true)
				.then(async () => {
					setOptionsContent({
						hasLoaded: true,
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
	}, [optionsContent.options]);

	useEffect(() => {
		async function getOptions() {
			setOptionsContent({
				hasLoaded: true,
				options: await BrowserStorage.getSyncOptions(),
			});
		}

		getOptions();
	}, []);

	useEffect(() => {
		async function getDateFormat() {
			setDateFormat(await TraktSettings.getTimeAndDateFormat());
		}
		getDateFormat();
	}, []);

	useEffect(() => {
		function loadFirstPage() {
			if (optionsContent.hasLoaded) {
				loadNextPage();
			}
		}

		loadFirstPage();
	}, [optionsContent.hasLoaded]);

	let itemsToShow: Item[] = [];
	if (optionsContent.hasLoaded && content.nextVisualPage > 0) {
		itemsToShow = content.items.slice(
			(content.nextVisualPage - 1) * optionsContent.options.itemsPerLoad.value,
			content.nextVisualPage * optionsContent.options.itemsPerLoad.value
		);
		if (optionsContent.options.hideSynced.value) {
			itemsToShow = itemsToShow.filter((x) => !x.trakt || !(x.trakt as ISyncItem).watchedAt);
		}
	}

	return content.isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<>
			<Box className="history-content">
				<HistoryOptionsList options={Object.values(optionsContent.options)} store={store} />
				<HistoryList dateFormat={dateFormat} items={itemsToShow} serviceName={serviceName} />
			</Box>
			<HistoryActions onNextPageClick={onNextPageClick} onSyncClick={onSyncClick} />
		</>
	);
};
