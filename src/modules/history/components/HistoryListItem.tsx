import { ItemsLoadData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { HistoryListItemCard } from '@components/HistoryListItemCard';
import { HistoryListItemMessage } from '@components/HistoryListItemMessage';
import { useSync } from '@contexts/SyncContext';
import { ScrobbleItem } from '@models/Item';
import { getService } from '@models/Service';
import { Sync as SyncIcon } from '@mui/icons-material';
import { Box, Button, Checkbox, Tooltip, Typography } from '@mui/material';
import { green, grey, red } from '@mui/material/colors';
import { ChangeEvent, CSSProperties, memo, useEffect, useState } from 'react';

export interface HistoryListItemProps {
	onContinueLoadingClick: () => Promise<void>;
}

const _HistoryListItem = ({
	onContinueLoadingClick,
	index: rawIndex,
	style,
}: HistoryListItemProps & { index: number; style: CSSProperties }): JSX.Element | null => {
	const { serviceId, store } = useSync();

	const index = serviceId ? rawIndex : rawIndex - 1;
	const [item, setItem] = useState<ScrobbleItem | null | undefined>(
		store.data.items[index] ?? undefined
	);

	const onCheckboxChange = async (event: ChangeEvent<HTMLInputElement>) => {
		if (!item) {
			return;
		}
		const newItem = item.clone();
		newItem.isSelected = event.target.checked;
		await store.update([newItem], false);
		setItem(newItem);
	};

	const openMissingWatchedDateDialog = async () => {
		if (!item) {
			return;
		}
		await Shared.events.dispatch('MISSING_WATCHED_DATE_DIALOG_SHOW', null, {
			items: [item],
		});
	};

	const openCorrectionDialog = async () => {
		if (!item) {
			return;
		}
		await Shared.events.dispatch('CORRECTION_DIALOG_SHOW', null, {
			item,
			isScrobblingItem: false,
		});
	};

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('ITEMS_LOAD', null, onItemsLoad);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('ITEMS_LOAD', null, onItemsLoad);
		};

		const onItemsLoad = (eventData: ItemsLoadData) => {
			if (index in eventData.items) {
				const newItem = eventData.items[index];
				setItem(newItem);
			}
		};

		startListeners();
		return stopListeners;
	}, []);

	const [statusColor, statusMessageName]: [string, MessageName] = item?.trakt
		? item?.trakt?.watchedAt
			? [green[500], 'itemSynced']
			: [red[500], 'itemNotSynced']
		: [grey[700], 'itemSyncStatusUnknown'];
	let serviceName;
	if (item?.serviceId) {
		serviceName = getService(item.serviceId).name;
	} else if (serviceId) {
		serviceName = getService(serviceId).name;
	} else {
		serviceName = I18N.translate('unknown');
	}

	if (item?.isHidden) {
		return <></>;
	}

	// Combine react-window's translateY with our translateX
	const combinedStyle = {
		...style,
		left: '50%',
		width: 'auto',
		transform: `${style.transform || ''} translateX(-50%)`.trim(),
	};

	return (
		<Box
			style={combinedStyle}
			sx={{
				display: 'flex',
				justifyContent: 'end',

				'& > *': {
					marginY: 0,
					marginX: 1,
				},
			}}
		>
			{index === -1 ? (
				<HistoryListItemMessage>
					<Typography variant="body1">{I18N.translate('autoSyncPageMessage')}</Typography>
				</HistoryListItemMessage>
			) : index === store.data.items.length && store.data.hasReachedEnd ? (
				<HistoryListItemMessage>
					{store.data.hasReachedLastSyncDate ? (
						<>
							<Box
								sx={{
									marginBottom: 2,
								}}
							>
								<Typography variant="body1">{I18N.translate('reachedLastSyncDate')}</Typography>
							</Box>
							<Button onClick={() => void onContinueLoadingClick()} variant="contained">
								{I18N.translate('continueLoading')}
							</Button>
						</>
					) : (
						<Typography variant="body1">{I18N.translate('reachedHistoryEnd')}</Typography>
					)}
				</HistoryListItemMessage>
			) : (
				<>
					<Checkbox
						disabled={!item?.isSelectable()}
						checked={item?.isSelected || false}
						edge="start"
						onChange={(event: ChangeEvent<HTMLInputElement>) => void onCheckboxChange(event)}
						sx={{
							alignSelf: 'center',
						}}
					/>
					<HistoryListItemCard
						isLoading={item?.isLoading ?? true}
						item={item}
						name={serviceName}
						imageUrl={item?.imageUrl}
						openMissingWatchedDateDialog={openMissingWatchedDateDialog}
					/>
					<Tooltip title={I18N.translate(statusMessageName)}>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								alignSelf: 'center',
								width: 32,
								margin: 0,
								padding: 0.5,
								backgroundColor: statusColor,
								color: '#fff',
							}}
						>
							<SyncIcon />
						</Box>
					</Tooltip>
					<HistoryListItemCard
						isLoading={item?.isLoading ?? true}
						item={item?.trakt}
						name="Trakt"
						suggestions={item?.suggestions}
						imageUrl={item?.trakt?.imageUrl}
						openCorrectionDialog={openCorrectionDialog}
					/>
				</>
			)}
		</Box>
	);
};

export const HistoryListItem = memo(_HistoryListItem);
