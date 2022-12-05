import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Service } from '@models/Service';
import { Clear as ClearIcon, Error as ErrorIcon } from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
import { memo } from 'react';

interface ServiceLastSyncOptionProps {
	service: Service;
	sync: boolean;
	autoSync: boolean;
	lastSync: number;
}

const _ServiceLastSyncOption = ({
	service,
	sync,
	autoSync,
	lastSync,
}: ServiceLastSyncOptionProps): JSX.Element => {
	const onClearLastSyncClick = async () => {
		await Shared.events.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearLastSyncTitle', service.name),
			message: I18N.translate('confirmClearLastSyncMessage'),
			onConfirm: async () => {
				const { syncCache } = await Shared.storage.get('syncCache');
				if (syncCache) {
					syncCache.items = syncCache.items.filter((item) => item.serviceId !== service.id);
					await Shared.storage.set({ syncCache }, false);
				}
				await Shared.events.dispatch('OPTIONS_CHANGE', null, {
					services: {
						[service.id]: {
							lastSync: 0,
							lastSyncId: '',
						},
					},
				});
			},
		});
	};

	return sync && autoSync && lastSync === 0 ? (
		<Tooltip title={I18N.translate('autoSyncNotActivated')}>
			<Box
				sx={{
					marginLeft: 0.5,
				}}
			>
				<ErrorIcon color="error" fontSize="small" />
			</Box>
		</Tooltip>
	) : (
		<Tooltip
			title={
				<>
					{I18N.translate('clearLastSync')}
					{lastSync > 0 && (
						<>
							<br />
							<br />
							{I18N.translate('lastSync')}: {Utils.timestamp(lastSync)}
						</>
					)}
				</>
			}
		>
			<Box component="span">
				<IconButton
					color="secondary"
					disabled={!sync || !autoSync}
					size="small"
					onClick={() => void onClearLastSyncClick()}
				>
					<ClearIcon fontSize="small" />
				</IconButton>
			</Box>
		</Tooltip>
	);
};

export const ServiceLastSyncOption = memo(_ServiceLastSyncOption);
