import { getServiceApi, ServiceApi } from '@apis/ServiceApi';
import { TmdbApi } from '@apis/TmdbApi';
import { TraktSync } from '@apis/TraktSync';
import { WrongItemApi } from '@apis/WrongItemApi';
import { BrowserStorage } from '@common/BrowserStorage';
import { Errors } from '@common/Errors';
import {
	EventDispatcher,
	HistoryOptionsChangeData,
	HistorySyncSuccessData,
	MissingWatchedDateAddedData,
	SyncStoreUpdateData,
	WrongItemCorrectedData,
} from '@common/Events';
import { I18N } from '@common/I18N';
import { RequestException } from '@common/Requests';
import { HistoryActions } from '@components/HistoryActions';
import { HistoryList } from '@components/HistoryList';
import { HistoryOptionsList } from '@components/HistoryOptionsList';
import { UtsCenter } from '@components/UtsCenter';
import { Box, Button, CircularProgress, Typography } from '@material-ui/core';
import { getService } from '@models/Service';
import { getSyncStore } from '@stores/SyncStore';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { useEffect, useState } from 'react';

interface PageProps {
	serviceId: string | null;
}

type LastSyncData = Record<
	string,
	{
		lastSync: number;
		lastSyncId: string;
	}
>;

const lastSyncData = {} as LastSyncData;

export const SyncPage: React.FC<PageProps> = (props: PageProps) => {
	const { serviceId } = props;

	const service = serviceId ? getService(serviceId) : null;
	const store = getSyncStore(serviceId);
	const api = serviceId ? getServiceApi(serviceId) : null;

	if (service && !lastSyncData[service.id]) {
		const serviceOptions = BrowserStorage.options.services[service.id];
		lastSyncData[service.id] =
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

	const [_, setSyncOptionsChanged] = useState({});
	const [content, setContent] = useState({
		isLoading: serviceId ? store.data.page === 0 : false,
		itemsChanged: {},
		visibleItemsChanged: {},
		...(serviceId
			? lastSyncData[serviceId]
			: {
					lastSync: 0,
					lastSyncId: '',
			  }),
		continueLoading: false,
	});

	const loadPreviousPage = () => {
		void store.goToPreviousPage().update();
	};

	const loadNextPage = () => {
		if (!service || !serviceId) {
			return;
		}
		if (store.data.itemsToLoad > 0 && !store.data.hasReachedEnd) {
			setContent((prevContent) => ({
				...prevContent,
				isLoading: true,
			}));
			const { hasReachedLastSyncDate } = store.data;
			if (hasReachedLastSyncDate) {
				store.setData({ hasReachedLastSyncDate: false });
			}
			EventDispatcher.dispatch('REQUESTS_CANCEL', null, { key: 'default' })
				.then(() => api?.loadHistory(store.data.itemsToLoad, content.lastSync, content.lastSyncId))
				.then(() => {
					if (hasReachedLastSyncDate) {
						void store.update();
					} else {
						void store.goToNextPage().update();
					}
				})
				.catch(() => {
					// Do nothing
				});
		} else if (store.data.hasNextPage) {
			void store.goToNextPage().update();
		}
	};

	const onPreviousPageClick = () => {
		loadPreviousPage();
	};

	const onNextPageClick = () => {
		loadNextPage();
	};

	const onSyncClick = async () => {
		const selectedItems = store.data.selectedItems;
		const missingWatchedDate = selectedItems.some((item) => item.isMissingWatchedDate());
		if (missingWatchedDate) {
			return EventDispatcher.dispatch('DIALOG_SHOW', null, {
				title: I18N.translate('cannotSync'),
				message: I18N.translate('cannotSyncMissingWatchedDate'),
			});
		}
		setContent((prevContent) => ({
			...prevContent,
			isLoading: true,
		}));
		await TraktSync.sync(selectedItems);
		if (serviceId) {
			const lastSync = selectedItems[0].watchedAt?.unix() ?? Math.trunc(Date.now() / 1e3);
			if (lastSync > BrowserStorage.options.services[serviceId].lastSync) {
				BrowserStorage.addOption({
					id: 'services',
					value: {
						...BrowserStorage.options.services,
						[serviceId]: {
							...BrowserStorage.options.services[serviceId],
							lastSync,
							lastSyncId: selectedItems[0].id,
						},
					},
				});
			}
			await BrowserStorage.saveOptions({});
			setContent((prevContent) => ({
				...prevContent,
				isLoading: false,
			}));
		} else {
			await BrowserStorage.remove('syncCache');
			await store.resetData().dispatchEvent(true);
		}
	};

	const onClearSyncCacheClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearSyncCacheTitle'),
			message: I18N.translate('confirmClearSyncCacheMessage'),
			onConfirm: async () => {
				await BrowserStorage.remove('syncCache');
				await store.resetData().dispatchEvent(true);
			},
		});
	};

	const onAddDateClick = async () => {
		await EventDispatcher.dispatch('MISSING_WATCHED_DATE_DIALOG_SHOW', null, {
			serviceId,
			items: store.data.selectedItems.filter((item) => item.isMissingWatchedDate()),
		});
	};

	const onContinueLoadingClick = () => {
		if (!service) {
			return;
		}
		store.setData({ hasReachedEnd: false });
		if (lastSyncData[service.id]) {
			lastSyncData[service.id] = {
				lastSync: 0,
				lastSyncId: '',
			};
		}
		setContent((prevContent) => ({
			...prevContent,
			lastSync: 0,
			lastSyncId: '',
			continueLoading: true,
		}));
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SYNC_STORE_UPDATE', null, onStoreUpdate);
			EventDispatcher.subscribe('SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
			EventDispatcher.subscribe('TRAKT_HISTORY_LOAD_ERROR', null, onTraktHistoryLoadError);
			EventDispatcher.subscribe('MISSING_WATCHED_DATE_ADDED', serviceId, onMissingWatchedDateAdded);
			EventDispatcher.subscribe('WRONG_ITEM_CORRECTED', serviceId, onWrongItemCorrected);
			EventDispatcher.subscribe('HISTORY_SYNC_SUCCESS', null, onHistorySyncSuccess);
			EventDispatcher.subscribe('HISTORY_SYNC_ERROR', null, onHistorySyncError);
			store.startListeners();
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SYNC_STORE_UPDATE', null, onStoreUpdate);
			EventDispatcher.unsubscribe('SERVICE_HISTORY_LOAD_ERROR', null, onHistoryLoadError);
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
				itemsChanged: {},
				visibleItemsChanged: data.visibleItemsChanged ? {} : prevContent.visibleItemsChanged,
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
			try {
				if (data.item.trakt?.syncId) {
					await TraktSync.removeHistory(data.item);
				}
			} catch (err) {
				// Do nothing
			}
			const storage = await BrowserStorage.get('traktCache');
			let { traktCache } = storage;
			if (!traktCache) {
				traktCache = {};
			}
			await ServiceApi.loadTraktItemHistory(data.item, traktCache, {
				type: data.type,
				traktId: data.traktId,
				url: data.url,
			});
			try {
				await WrongItemApi.saveSuggestion(data.item, data.url);
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
			await store.dispatchEvent(true);
		};

		const onMissingWatchedDateAdded = async (data: MissingWatchedDateAddedData): Promise<void> => {
			await store.dispatchEvent(true);
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
			BrowserStorage.saveSyncOptions({ [data.id]: data.value })
				.then(async () => {
					setSyncOptionsChanged({});
					if (serviceId && data.id.startsWith('addWithReleaseDate')) {
						ServiceApi.updateTraktHistory(store.data.visibleItems)
							.then(() => void store.updateVisibleItems(false))
							.catch((err) => {
								// Do nothing
							});
					} else if (serviceId && data.id === 'itemsPerLoad' && typeof data.value === 'number') {
						checkItemsPerPage(data.value);
					} else {
						void store.updateVisibleItems(false);
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
			if (!service || !serviceId) {
				return;
			}
			store.setData({ itemsPerPage });
			if (store.data.itemsToLoad > 0 && !store.data.hasReachedEnd && !content.isLoading) {
				setContent((prevContent) => ({
					...prevContent,
					isLoading: true,
				}));
				EventDispatcher.dispatch('REQUESTS_CANCEL', null, { key: 'default' })
					.then(() =>
						api?.loadHistory(store.data.itemsToLoad, content.lastSync, content.lastSyncId)
					)
					.then(() => store.update())
					.catch(() => {
						// Do nothing
					});
			} else {
				void store.update();
			}
		};

		startListeners();
		return stopListeners;
	}, [content.isLoading]);

	useEffect(() => {
		const loadFirstPage = () => {
			if (serviceId && store.data.page === 0) {
				store.setData({ itemsPerPage: BrowserStorage.syncOptions.itemsPerLoad });
				loadNextPage();
			}
		};

		loadFirstPage();
	}, []);

	useEffect(() => {
		const loadData = async () => {
			if (content.isLoading) {
				return;
			}
			try {
				await ServiceApi.loadTraktHistory(store.data.visibleItems);
				await Promise.all([
					WrongItemApi.loadSuggestions(store.data.visibleItems),
					TmdbApi.loadImages(store.data.visibleItems),
				]);
				await store.updateVisibleItems(false);
			} catch (err) {
				// Do nothing
			}
		};

		void loadData();
	}, [content.isLoading, content.visibleItemsChanged]);

	useEffect(() => {
		const checkIfContinueLoading = () => {
			if (content.continueLoading) {
				loadNextPage();
			}
		};

		checkIfContinueLoading();
	}, [content.continueLoading]);

	const showNavigationButtons = !!serviceId;
	const hasPreviousPage = showNavigationButtons && store.data.page > 1;
	const hasNextPage =
		showNavigationButtons &&
		((store.data.itemsToLoad > 0 && !store.data.hasReachedEnd) || store.data.hasNextPage);
	const hasSelectedItems = store.data.selectedItems.length > 0;
	const showClearSyncCacheButton = !serviceId;
	const showAddDateButton =
		store.data.selectedItems.filter((item) => item.isMissingWatchedDate()).length > 1;

	return content.isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<>
			{!serviceId && (
				<Box className="history-container-message">
					<Typography variant="body1">{I18N.translate('autoSyncPageMessage')}</Typography>
				</Box>
			)}
			<Box className="history-content">
				<HistoryOptionsList store={store} />
				{store.data.visibleItems.length > 0 && (
					<HistoryList items={store.data.visibleItems} serviceId={serviceId} />
				)}
			</Box>
			{!hasNextPage && (
				<Box className="history-container-message">
					{store.data.hasReachedLastSyncDate ? (
						<>
							<Box mb={2}>
								<Typography variant="body1">{I18N.translate('reachedLastSyncDate')}</Typography>
							</Box>
							<Button color="primary" onClick={onContinueLoadingClick} variant="contained">
								{I18N.translate('continueLoading')}
							</Button>
						</>
					) : (
						<Typography variant="body1">{I18N.translate('reachedHistoryEnd')}</Typography>
					)}
				</Box>
			)}
			<HistoryActions
				showNavigationButtons={showNavigationButtons}
				hasPreviousPage={hasPreviousPage}
				hasNextPage={hasNextPage}
				hasSelectedItems={hasSelectedItems}
				showClearSyncCacheButton={showClearSyncCacheButton}
				showAddDateButton={showAddDateButton}
				onPreviousPageClick={onPreviousPageClick}
				onNextPageClick={onNextPageClick}
				onSyncClick={onSyncClick}
				onClearSyncCacheClick={onClearSyncCacheClick}
				onAddDateClick={onAddDateClick}
			/>
		</>
	);
};

SyncPage.propTypes = {
	serviceId: PropTypes.any,
};
