import { Box, CircularProgress, Typography } from '@material-ui/core';
import * as moment from 'moment';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { TmdbApi } from '../../api/TmdbApi';
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
	SyncStoreUpdateData,
	WrongItemCorrectedData,
} from '../../common/Events';
import { I18N } from '../../common/I18N';
import { RequestException } from '../../common/Requests';
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
	items: Item[];
	visibleItems: Item[];
	page: number;
	itemsPerPage: number;
	hasReachedEnd: boolean;
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
		isLoading: store.data.page === 0,
		...store.data,
	});
	const [dateFormat, setDateFormat] = useState('MMMM Do YYYY, H:mm:ss');

	const loadPreviousPage = () => {
		void store.goToPreviousPage().update();
	};

	const loadNextPage = () => {
		const itemsToLoad = (store.data.page + 1) * store.data.itemsPerPage - store.data.items.length;
		if (itemsToLoad > 0 && !store.data.hasReachedEnd) {
			setContent((prevContent) => ({
				...prevContent,
				isLoading: true,
			}));
			EventDispatcher.dispatch('REQUESTS_CANCEL', null, { key: 'default' })
				.then(() => api.loadHistory(itemsToLoad))
				.then(() => store.goToNextPage().update())
				.catch(() => {
					// Do nothing
				});
		} else {
			const hasNextPage =
				store.data.itemsPerPage > 0 &&
				store.data.page < Math.ceil(store.data.items.length / store.data.itemsPerPage);
			if (hasNextPage) {
				void store.goToNextPage().update();
			}
		}
	};

	const onPreviousPageClick = () => {
		loadPreviousPage();
	};

	const onNextPageClick = () => {
		loadNextPage();
	};

	const onSyncClick = async () => {
		if (!syncOptionsContent.options.addWithReleaseDate.value) {
			const missingWatchedDate = content.visibleItems.find((item) => !item.watchedAt);
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
		await TraktSync.sync(content.visibleItems, syncOptionsContent.options.addWithReleaseDate.value);
		setContent((prevContent) => ({
			...prevContent,
			isLoading: false,
		}));
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SYNC_STORE_UPDATE', null, onStoreUpdate);
			EventDispatcher.subscribe('STREAMING_SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
			EventDispatcher.subscribe('TRAKT_HISTORY_LOAD_ERROR', null, onTraktHistoryLoadError);
			EventDispatcher.subscribe('MISSING_WATCHED_DATE_ADDED', serviceId, onMissingWatchedDateAdded);
			EventDispatcher.subscribe('WRONG_ITEM_CORRECTED', serviceId, onWrongItemCorrected);
			EventDispatcher.subscribe('HISTORY_SYNC_SUCCESS', null, onHistorySyncSuccess);
			EventDispatcher.subscribe('HISTORY_SYNC_ERROR', null, onHistorySyncError);
			store.startListeners();
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SYNC_STORE_UPDATE', null, onStoreUpdate);
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

			void EventDispatcher.dispatch('REQUESTS_CANCEL', null, { key: 'default' });
		};

		const onStoreUpdate = (data: SyncStoreUpdateData) => {
			setContent((prevContent) => ({
				...prevContent,
				isLoading: false,
				...data.data,
			}));
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
				if (!(err as RequestException).canceled) {
					Errors.error('Failed to save suggestion.', err);
					await EventDispatcher.dispatch('SNACKBAR_SHOW', null, {
						messageName: 'saveSuggestionFailed',
						severity: 'error',
					});
				}
			}
			await BrowserStorage.set({ traktCache }, false);
			await getSyncStore(serviceId).dispatchEvent();
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
			await getSyncStore(serviceId).dispatchEvent();
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
					if (data.id === 'itemsPerLoad' && typeof data.value === 'number') {
						checkItemsPerPage(data.value);
					}
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

		const checkItemsPerPage = (itemsPerPage: number) => {
			const itemsToLoad = (store.data.page + 1) * itemsPerPage - store.data.items.length;
			if (itemsToLoad > 0 && !store.data.hasReachedEnd && !content.isLoading) {
				store.setData({ itemsPerPage });
				setContent((prevContent) => ({
					...prevContent,
					isLoading: true,
					itemsPerPage,
				}));
				EventDispatcher.dispatch('REQUESTS_CANCEL', null, { key: 'default' })
					.then(() => api.loadHistory(itemsToLoad))
					.then(() => store.update())
					.catch(() => {
						// Do nothing
					});
			} else {
				void store.update({ itemsPerPage });
			}
		};

		startListeners();
		return stopListeners;
	}, [syncOptionsContent.options, content.isLoading]);

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
			if (syncOptionsContent.hasLoaded && content.page === 0) {
				store.setData({ itemsPerPage: syncOptionsContent.options.itemsPerLoad.value });
				loadNextPage();
			}
		};

		loadFirstPage();
	}, [syncOptionsContent.hasLoaded]);

	useEffect(() => {
		const loadData = async () => {
			try {
				await getApi(serviceId).loadTraktHistory(content.visibleItems);
				await Promise.all([
					WrongItemApi.loadSuggestions(serviceId, content.visibleItems),
					TmdbApi.loadImages(serviceId, content.visibleItems),
				]);
				await store.dispatchEvent();
			} catch (err) {
				// Do nothing
			}
		};

		void loadData();
	}, [content.visibleItems]);

	let filteredItems = content.visibleItems;
	if (syncOptionsContent.hasLoaded) {
		if (syncOptionsContent.options.hideSynced.value) {
			filteredItems = filteredItems.filter((item) => !item.trakt?.watchedAt);
		}
		filteredItems = filteredItems.filter(
			(item) =>
				typeof item.percentageWatched === 'undefined' ||
				item.percentageWatched >= syncOptionsContent.options.minPercentageWatched.value
		);
	}

	const hasNextPage =
		((content.page + 1) * content.itemsPerPage - content.items.length > 0 &&
			!content.hasReachedEnd) ||
		(content.itemsPerPage > 0 &&
			content.page < Math.ceil(content.items.length / content.itemsPerPage));

	return content.isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<>
			<Box className="history-content">
				<HistoryOptionsList options={Object.values(syncOptionsContent.options)} store={store} />
				{filteredItems.length > 0 ? (
					<HistoryList
						dateFormat={dateFormat}
						items={filteredItems}
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
			<HistoryActions
				hasPreviousPage={content.page > 1}
				hasNextPage={hasNextPage}
				onPreviousPageClick={onPreviousPageClick}
				onNextPageClick={onNextPageClick}
				onSyncClick={onSyncClick}
			/>
		</>
	);
};

SyncPage.propTypes = {
	serviceId: PropTypes.any.isRequired,
	serviceName: PropTypes.string.isRequired,
	store: PropTypes.instanceOf(SyncStore).isRequired,
	api: PropTypes.any.isRequired,
};
