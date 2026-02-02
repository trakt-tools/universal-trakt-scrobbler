import { CorrectionApi } from '@apis/CorrectionApi';
import { ServiceApi } from '@apis/ServiceApi';
import { TmdbApi } from '@apis/TmdbApi';
import { TraktSync } from '@apis/TraktSync';
import {
	HistorySyncSuccessData,
	ItemCorrectedData,
	MissingWatchedDateAddedData,
	StorageOptionsChangeData,
} from '@common/Events';
import { Shared } from '@common/Shared';
import { HistoryListItem } from '@components/HistoryListItem';
import { useHistory } from '@contexts/HistoryContext';
import { useSync } from '@contexts/SyncContext';
import { createScrobbleItem, ScrobbleItem } from '@models/Item';
import { Box } from '@mui/material';
import { SyncStore } from '@stores/SyncStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { List, ListImperativeAPI } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';

export type LastSyncValues = Record<string, LastSyncValue>;

export interface LastSyncValue {
	lastSync: number;
	lastSyncId: string;
}

const ITEMS_PER_LOAD = 10;
const lastSyncValues = {} as LastSyncValues;

const calculateItemCount = (serviceId: string | null, store: SyncStore) => {
	return (
		store.data.items.length + (store.data.hasReachedEnd ? 1 : ITEMS_PER_LOAD) + (serviceId ? 0 : 1)
	);
};

const calculateTotalItems = (serviceId: string | null, store: SyncStore) => {
	return store.data.items.length + (store.data.hasReachedEnd ? 1 : 0) + (serviceId ? 0 : 1);
};

export const HistoryList = (): JSX.Element => {
	const history = useHistory();
	const { serviceId, service, api, store } = useSync();

	const [itemCount, setItemCount] = useState(calculateItemCount(serviceId, store));
	const [continueLoading, setContinueLoading] = useState(false);

	const listRef = useRef<ListImperativeAPI | null>(null);
	if (service && !lastSyncValues[service.id]) {
		const serviceOptions = Shared.storage.options.services[service.id];
		lastSyncValues[service.id] =
			service.hasAutoSync && serviceOptions?.autoSync && serviceOptions.autoSyncDays > 0
				? {
						lastSync: serviceOptions.lastSync,
						lastSyncId: serviceOptions.lastSyncId,
					}
				: {
						lastSync: 0,
						lastSyncId: '',
					};
	}
	const lastSyncValue = serviceId
		? lastSyncValues[serviceId]
		: {
				lastSync: 0,
				lastSyncId: '',
			};

	const startLoading = async (items: ScrobbleItem[]) => {
		store.data.isLoading = true;
		await Shared.events.dispatch('SYNC_STORE_LOADING_START', null, {});
		const newItems = items.map((item) => {
			const newItem = item.clone();
			newItem.isLoading = true;
			return newItem;
		});
		await store.update(newItems, true);
		return newItems;
	};

	const stopLoading = async (items: ScrobbleItem[]) => {
		store.data.isLoading = false;
		await Shared.events.dispatch('SYNC_STORE_LOADING_STOP', null, {});
		const newItems = items.map((item) => {
			const newItem = item.clone();
			newItem.isLoading = false;
			return newItem;
		});
		await store.update(newItems, true);
		return newItems;
	};

	const checkEnd = async () => {
		if (store.data.hasReachedEnd) {
			await Shared.events.dispatch('ITEMS_LOAD', null, {
				items: {
					[store.data.items.length]: null,
				},
			});
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const loadMoreItems = async (startIndex: number, stopIndex: number) => {
		if (!serviceId || !service || !api) {
			return;
		}
		if (startIndex < store.data.items.length) {
			// Index already loaded
			return;
		}
		if (store.data.isLoading) {
			store.data.loadQueue.push(startIndex);
			return;
		}

		await startLoading([]);
		let items: ScrobbleItem[] = [];
		try {
			const { hasReachedLastSyncDate } = store.data;
			if (hasReachedLastSyncDate) {
				await store.setData({ hasReachedLastSyncDate: false });
			}
			items = await api.loadHistory(
				ITEMS_PER_LOAD,
				lastSyncValue.lastSync,
				lastSyncValue.lastSyncId
			);
			items = await checkHiddenSelected(items);
			items = await loadData(items);
		} catch (_err) {
			// Do nothing
		}
		await stopLoading(items);
		await checkEnd();

		const nextStartIndex = store.data.loadQueue.pop();
		if (typeof nextStartIndex !== 'undefined') {
			void loadMoreItems(nextStartIndex, nextStartIndex + (ITEMS_PER_LOAD - 1));
		}
	};

	const loadData = async (items: ScrobbleItem[]) => {
		items = await ServiceApi.loadTraktHistory(items, processItem);
		if (Shared.storage.options.sendReceiveSuggestions) {
			items = await CorrectionApi.loadSuggestions(items);
			await store.update(items, true);
		}
		if (Shared.storage.options.loadImages) {
			items = await TmdbApi.loadImages(items);
			await store.update(items, true);
		}
		return items;
	};

	const processItem = async (item: ScrobbleItem) => {
		const [newItem] = await checkHiddenSelected([item]);
		await store.update([newItem], true);
		return newItem;
	};

	const onContinueLoadingClick = async () => {
		if (!service) {
			return;
		}
		await store.setData({ hasReachedEnd: false });
		if (lastSyncValues[service.id]) {
			lastSyncValues[service.id] = {
				lastSync: 0,
				lastSyncId: '',
			};
		}
		setContinueLoading(true);
	};

	const addWithReleaseDate = async (items: ScrobbleItem[]): Promise<ScrobbleItem[]> => {
		let newItems = await startLoading(items);
		newItems = newItems.map((item) => {
			const newItem = item.clone();
			if (newItem.trakt) {
				delete newItem.trakt.watchedAt;
			}
			return newItem;
		});
		await store.update(newItems, true);
		newItems = await loadData(newItems);
		newItems = await stopLoading(newItems);
		return newItems;
	};

	const checkHiddenSelected = async (items: ScrobbleItem[]): Promise<ScrobbleItem[]> => {
		let index = -1;

		const newItems = [];
		const itemsToUpdate = [];
		for (const item of items) {
			const doHide = item.doHide();
			const isSelectable = item.isSelectable();
			if (item.isHidden !== doHide || (item.isSelected && !isSelectable)) {
				if (index < 0) {
					index = item.index;
				}

				const newItem = item.clone();
				if (item.isHidden !== doHide) {
					newItem.isHidden = doHide;
				}
				if (item.isSelected && !isSelectable) {
					newItem.isSelected = false;
				}
				newItems.push(newItem);
				itemsToUpdate.push(newItem);
			} else {
				newItems.push(item);
			}
		}
		if (itemsToUpdate.length > 0 && index > -1) {
			await store.update(itemsToUpdate, true);
		}
		return newItems;
	};

	const isItemLoaded = useCallback(
		(index: number) => index < calculateTotalItems(serviceId, store),
		[]
	);

	const itemSize = useCallback(
		(index: number) => (store.data.items[index]?.isHidden ? 0 : 250),
		[]
	);

	const itemData = useMemo(() => ({ onContinueLoadingClick }), []);

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
			Shared.events.subscribe('TRAKT_HISTORY_LOAD_ERROR', null, onTraktHistoryLoadError);
			Shared.events.subscribe('MISSING_WATCHED_DATE_ADDED', null, onMissingWatchedDateAdded);
			Shared.events.subscribe('ITEM_CORRECTED', null, onItemCorrected);
			Shared.events.subscribe('HISTORY_SYNC_SUCCESS', null, onHistorySyncSuccess);
			Shared.events.subscribe('HISTORY_SYNC_ERROR', null, onHistorySyncError);
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
			Shared.events.subscribe('ITEMS_LOAD', null, onItemsLoad);
			Shared.events.subscribe('SYNC_STORE_RESET', null, checkEnd);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
			Shared.events.unsubscribe('TRAKT_HISTORY_LOAD_ERROR', null, onTraktHistoryLoadError);
			Shared.events.unsubscribe('MISSING_WATCHED_DATE_ADDED', null, onMissingWatchedDateAdded);
			Shared.events.unsubscribe('ITEM_CORRECTED', null, onItemCorrected);
			Shared.events.unsubscribe('HISTORY_SYNC_SUCCESS', null, onHistorySyncSuccess);
			Shared.events.unsubscribe('HISTORY_SYNC_ERROR', null, onHistorySyncError);
			Shared.events.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
			Shared.events.unsubscribe('ITEMS_LOAD', null, onItemsLoad);
			Shared.events.unsubscribe('SYNC_STORE_RESET', null, checkEnd);

			void Shared.events.dispatch('REQUESTS_CANCEL', null, {
				tabId: Shared.tabId,
				key: 'default',
			});
		};

		const onHistoryLoadError = async () => {
			history.push('/home');
			await Shared.events.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'loadHistoryError',
				severity: 'error',
			});
		};

		const onTraktHistoryLoadError = async () => {
			await Shared.events.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'loadTraktHistoryError',
				severity: 'error',
			});
		};

		const onMissingWatchedDateAdded = async (data: MissingWatchedDateAddedData): Promise<void> => {
			let newItems = data.newItems;
			newItems = await startLoading(newItems);
			await store.update(newItems, true);
			newItems = await loadData(newItems);
			await stopLoading(newItems);
		};

		const onItemCorrected = async (data: ItemCorrectedData): Promise<void> => {
			let newItem = createScrobbleItem(data.newItem);
			[newItem] = await startLoading([newItem]);
			try {
				if (data.oldItem.trakt?.syncId) {
					const oldItem = createScrobbleItem(data.oldItem);
					await TraktSync.removeHistory(oldItem);
				}
			} catch (_err) {
				// Do nothing
			}
			await store.update([newItem], true);
			[newItem] = await loadData([newItem]);
			await stopLoading([newItem]);
		};

		const onHistorySyncSuccess = async (data: HistorySyncSuccessData) => {
			await Shared.events.dispatch('SNACKBAR_SHOW', null, {
				messageArgs: [data.added.episodes.toString(), data.added.movies.toString()],
				messageName: 'historySyncSuccess',
				severity: 'success',
			});
		};

		const onHistorySyncError = async () => {
			await Shared.events.dispatch('SNACKBAR_SHOW', null, {
				messageName: 'historySyncError',
				severity: 'error',
			});
		};

		const onStorageOptionsChange = async (data: StorageOptionsChangeData) => {
			if (!data.syncOptions) {
				return;
			}

			if (
				'addWithReleaseDate' in data.syncOptions ||
				'addWithReleaseDateMissing' in data.syncOptions
			) {
				await addWithReleaseDate(store.data.items);
			} else if ('hideSynced' in data.syncOptions || 'minPercentageWatched' in data.syncOptions) {
				await checkHiddenSelected(store.data.items);
			}
		};

		const onItemsLoad = () => {
			setItemCount(calculateItemCount(serviceId, store));
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const checkIfContinueLoading = async () => {
			if (continueLoading) {
				await loadMoreItems(store.data.items.length, store.data.items.length + ITEMS_PER_LOAD);
			}
		};

		void checkIfContinueLoading();
	}, [continueLoading]);

	useEffect(() => {
		const checkLoad = async () => {
			if (store.data.items.length > 0) {
				let newItems = await startLoading(store.data.items);
				newItems = await loadData(newItems);
				await stopLoading(newItems);
			}
		};

		void checkLoad();
	}, []);

	const onRowsRendered = useInfiniteLoader({
		isRowLoaded: isItemLoaded,
		loadMoreRows: loadMoreItems,
		rowCount: itemCount,
		threshold: 1,
	});

	return (
		<Box
			sx={{
				display: 'flex',
				flex: 1,
				justifyContent: 'center',
				height: 1,
				paddingLeft: ({ sizes }) => `${sizes.sidebar}px`,
			}}
		>
			<AutoSizer
				style={{
					width: '100%',
				}}
				renderProp={({ height }: { height: number | undefined }) =>
					height ? (
						<List
							rowCount={itemCount}
							rowHeight={itemSize}
							rowProps={itemData}
							onRowsRendered={onRowsRendered}
							overscanCount={3}
							listRef={listRef}
							rowComponent={HistoryListItem as never}
							style={{ width: '100%', height }}
						/>
					) : null
				}
			/>
		</Box>
	);
};
