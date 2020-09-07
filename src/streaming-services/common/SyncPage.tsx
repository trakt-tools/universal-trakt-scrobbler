import { Box, CircularProgress, Typography } from '@material-ui/core';
import * as moment from 'moment';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { TraktSettings } from '../../api/TraktSettings';
import { TraktSync } from '../../api/TraktSync';
import { WrongItemApi } from '../../api/WrongItemApi';
import {
	BrowserStorage,
	Options,
	StorageValuesSyncOptions,
	SyncOptions,
} from '../../common/BrowserStorage';
import { Errors } from '../../common/Errors';
import {
	EventDispatcher,
	HistoryOptionsChangeData,
	HistorySyncSuccessData,
	MissingWatchedDateAddedData,
	StreamingServiceStoreUpdateData,
	WrongItemCorrectedData,
} from '../../common/Events';
import { I18N } from '../../common/I18N';
import { UtsCenter } from '../../components/UtsCenter';
import { Item } from '../../models/Item';
import { HistoryActions } from '../../modules/history/components/HistoryActions';
import { HistoryList } from '../../modules/history/components/HistoryList';
import { HistoryOptionsList } from '../../modules/history/components/HistoryOptionsList';
import { StreamingServiceId } from '../streaming-services';
import { Api } from './Api';
import { getApi, getSyncStore } from './common';
import { SyncStore } from './SyncStore';

interface PageProps {
	serviceId: StreamingServiceId;
	serviceName: string;
	store: SyncStore;
	api: Api;
}

interface OptionsContent {
	hasLoaded: boolean;
	options: Options;
}

interface SyncOptionsContent {
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

export const SyncPage: React.FC<PageProps> = (props: PageProps) => {
	const { serviceId, serviceName, store, api } = props;

	const [optionsContent, setOptionsContent] = useState<OptionsContent>({
		hasLoaded: false,
		options: {} as Options,
	});
	const [syncOptionsContent, setSyncOptionsContent] = useState<SyncOptionsContent>({
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
			(content.nextVisualPage + 1) * syncOptionsContent.options.itemsPerLoad.value -
			content.items.length;
		if (itemsToLoad > 0) {
			setContent((prevContent) => ({
				...prevContent,
				isLoading: true,
			}));
			void api.loadHistory(content.nextPage, content.nextVisualPage, itemsToLoad);
		} else {
			void store.update({
				nextVisualPage: content.nextVisualPage + 1,
			});
		}
	};

	const onNextPageClick = () => {
		loadNextPage();
	};

	const onSyncClick = async () => {
		if (!syncOptionsContent.options.addWithReleaseDate.value) {
			const missingWatchedDate = store.data.items.find((item) => !item.watchedAt);
			if (missingWatchedDate) {
				return EventDispatcher.dispatch('DIALOG_SHOW', null, {
					title: I18N.translate('cannotSync'),
					message: I18N.translate('cannotSyncMissingWatchedDate'),
				});
			}
		}
		setContent((prevContent) => ({
			...prevContent,
			isLoading: true,
		}));
		await TraktSync.sync(store.data.items, syncOptionsContent.options.addWithReleaseDate.value);
		setContent((prevContent) => ({
			...prevContent,
			isLoading: false,
		}));
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('STREAMING_SERVICE_STORE_UPDATE', null, onStoreUpdate);
			EventDispatcher.subscribe('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
			EventDispatcher.subscribe('TRAKT_HISTORY_LOAD_ERROR', null, onTraktHistoryLoadError);
			EventDispatcher.subscribe('MISSING_WATCHED_DATE_ADDED', serviceId, onMissingWatchedDateAdded);
			EventDispatcher.subscribe('WRONG_ITEM_CORRECTED', serviceId, onWrongItemCorrected);
			EventDispatcher.subscribe('HISTORY_SYNC_SUCCESS', null, onHistorySyncSuccess);
			EventDispatcher.subscribe('HISTORY_SYNC_ERROR', null, onHistorySyncError);
			store.startListeners();
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('STREAMING_SERVICE_STORE_UPDATE', null, onStoreUpdate);
			EventDispatcher.unsubscribe('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
			EventDispatcher.unsubscribe('TRAKT_HISTORY_LOAD_ERROR', null, onTraktHistoryLoadError);
			EventDispatcher.unsubscribe(
				'MISSING_WATCHED_DATE_ADDED',
				serviceId,
				onMissingWatchedDateAdded
			);
			EventDispatcher.unsubscribe('WRONG_ITEM_CORRECTED', serviceId, onWrongItemCorrected);
			EventDispatcher.unsubscribe('HISTORY_SYNC_SUCCESS', null, onHistorySyncSuccess);
			EventDispatcher.unsubscribe('HISTORY_SYNC_ERROR', null, onHistorySyncError);
			store.stopListeners();
		};

		const onStoreUpdate = (data: StreamingServiceStoreUpdateData) => {
			setContent({
				isLoading: false,
				...data.data,
			});
		};

		const onHistoryLoadError = async () => {
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'loadHistoryError',
				severity: 'error',
			});
		};

		const onTraktHistoryLoadError = async () => {
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'loadTraktHistoryError',
				severity: 'error',
			});
		};

		const onWrongItemCorrected = async (data: WrongItemCorrectedData): Promise<void> => {
			const storage = await BrowserStorage.get('traktCache');
			let { traktCache } = storage;
			if (!traktCache) {
				traktCache = {};
			}
			await getApi(serviceId).loadTraktItemHistory(data.item, traktCache, {
				type: data.type,
				traktId: data.traktId,
				url: data.url,
			});
			try {
				await WrongItemApi.saveSuggestion(serviceId, data.item, data.url);
			} catch (err) {
				Errors.error('Failed to save suggestion.', err);
				await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
					messageName: 'saveSuggestionFailed',
					severity: 'error',
				});
			}
			await BrowserStorage.set({ traktCache }, false);
			await getSyncStore(serviceId).update();
		};

		const onMissingWatchedDateAdded = async (data: MissingWatchedDateAddedData): Promise<void> => {
			switch (data.dateType) {
				case 'release-date': {
					const releaseDate = data.item.trakt?.releaseDate;
					if (releaseDate) {
						data.item.watchedAt = moment(releaseDate);
					}
					break;
				}
				case 'current-date':
					data.item.watchedAt = moment();
					break;
				case 'custom-date':
					if (data.date) {
						data.item.watchedAt = data.date;
					}
					break;
				// no-default
			}
			await getSyncStore(serviceId).update();
		};

		const onHistorySyncSuccess = async (data: HistorySyncSuccessData) => {
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageArgs: [data.added.episodes.toString(), data.added.movies.toString()],
				messageName: 'historySyncSuccess',
				severity: 'success',
			});
		};

		const onHistorySyncError = async () => {
			await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'historySyncError',
				severity: 'error',
			});
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('HISTORY_OPTIONS_CHANGE', null, onOptionsChange);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('HISTORY_OPTIONS_CHANGE', null, onOptionsChange);
		};

		const onOptionsChange = (data: HistoryOptionsChangeData) => {
			const optionsToSave = {} as StorageValuesSyncOptions;
			const options = {
				...syncOptionsContent.options,
				[data.id]: {
					...syncOptionsContent.options[data.id],
					value: data.value,
				},
			};
			for (const option of Object.values(options)) {
				optionsToSave[option.id] = option.value as never;
			}
			BrowserStorage.set({ syncOptions: optionsToSave }, true)
				.then(async () => {
					setSyncOptionsContent({
						hasLoaded: true,
						options,
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
				});
		};

		startListeners();
		return stopListeners;
	}, [syncOptionsContent.options]);

	useEffect(() => {
		const getOptions = async () => {
			setOptionsContent({
				hasLoaded: true,
				options: await BrowserStorage.getOptions(),
			});
		};

		void getOptions();
	}, []);

	useEffect(() => {
		const getSyncOptions = async () => {
			setSyncOptionsContent({
				hasLoaded: true,
				options: await BrowserStorage.getSyncOptions(),
			});
		};

		void getSyncOptions();
	}, []);

	useEffect(() => {
		const getDateFormat = async () => {
			setDateFormat(await TraktSettings.getTimeAndDateFormat());
		};

		void getDateFormat();
	}, []);

	useEffect(() => {
		const loadFirstPage = () => {
			if (syncOptionsContent.hasLoaded) {
				loadNextPage();
			}
		};

		loadFirstPage();
	}, [syncOptionsContent.hasLoaded]);

	let itemsToShow: Item[] = [];
	if (syncOptionsContent.hasLoaded && content.nextVisualPage > 0) {
		itemsToShow = content.items.slice(
			(content.nextVisualPage - 1) * syncOptionsContent.options.itemsPerLoad.value,
			content.nextVisualPage * syncOptionsContent.options.itemsPerLoad.value
		);
		if (syncOptionsContent.options.hideSynced.value) {
			itemsToShow = itemsToShow.filter((x) => !x.trakt?.watchedAt);
		}
	}

	return content.isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<>
			<Box className="history-content">
				<HistoryOptionsList options={Object.values(syncOptionsContent.options)} store={store} />
				{itemsToShow.length > 0 ? (
					<HistoryList
						dateFormat={dateFormat}
						items={itemsToShow}
						serviceId={serviceId}
						serviceName={serviceName}
						sendReceiveSuggestions={optionsContent.options.sendReceiveSuggestions?.value ?? false}
					/>
				) : (
					<Box className="history-content--empty">
						<Typography variant="body1">{I18N.translate('noMoreHistory')}</Typography>
					</Box>
				)}
			</Box>
			<HistoryActions onNextPageClick={onNextPageClick} onSyncClick={onSyncClick} />
		</>
	);
};

SyncPage.propTypes = {
	serviceId: PropTypes.any.isRequired,
	serviceName: PropTypes.string.isRequired,
	store: PropTypes.instanceOf(SyncStore).isRequired,
	api: PropTypes.any.isRequired,
};
