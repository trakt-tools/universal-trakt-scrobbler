import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Box, IconButton, Tooltip } from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import ErrorIcon from '@material-ui/icons/Error';
import { Service } from '@models/Service';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';

interface ServiceLastSyncOptionProps {
	service: Service;
	sync: boolean;
	autoSync: boolean;
	lastSync: number;
}

const _ServiceLastSyncOption: React.FC<ServiceLastSyncOptionProps> = ({
	service,
	sync,
	autoSync,
	lastSync,
}: ServiceLastSyncOptionProps) => {
	const onClearLastSyncClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearLastSyncTitle', service.name),
			message: I18N.translate('confirmClearLastSyncMessage'),
			onConfirm: async () => {
				const { syncCache } = await BrowserStorage.get('syncCache');
				if (syncCache) {
					syncCache.items = syncCache.items.filter((item) => item.serviceId !== service.id);
					await BrowserStorage.set({ syncCache }, false);
				}
				await EventDispatcher.dispatch('OPTIONS_CHANGE', null, {
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
			<Box ml={0.5}>
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
							{I18N.translate('lastSync')}: {moment(lastSync * 1e3).format(Shared.dateFormat)}
						</>
					)}
				</>
			}
		>
			<span>
				<IconButton
					color="secondary"
					disabled={!sync || !autoSync}
					size="small"
					onClick={onClearLastSyncClick}
				>
					<ClearIcon fontSize="small" />
				</IconButton>
			</span>
		</Tooltip>
	);
};

_ServiceLastSyncOption.propTypes = {
	service: PropTypes.instanceOf(Service).isRequired,
	sync: PropTypes.bool.isRequired,
	autoSync: PropTypes.bool.isRequired,
	lastSync: PropTypes.number.isRequired,
};

export const ServiceLastSyncOption = React.memo(_ServiceLastSyncOption);
