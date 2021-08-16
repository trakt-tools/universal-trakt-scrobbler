import { I18N } from '@common/I18N';
import { ServiceAutoSyncDaysOption } from '@components/ServiceAutoSyncDaysOption';
import { ServiceAutoSyncOption } from '@components/ServiceAutoSyncOption';
import { ServiceLastSyncOption } from '@components/ServiceLastSyncOption';
import { Grid, Tooltip } from '@material-ui/core';
import BlockIcon from '@material-ui/icons/Block';
import { Service } from '@models/Service';
import PropTypes from 'prop-types';
import React from 'react';

interface ServiceAutoSyncOptionsProps {
	service: Service;
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	lastSync: number;
	handleChange: (optionId: string, newValue: unknown) => void;
}

export const _ServiceAutoSyncOptions: React.FC<ServiceAutoSyncOptionsProps> = ({
	service,
	sync,
	autoSync,
	autoSyncDays,
	lastSync,
	handleChange,
}) => {
	return (
		<Grid item className="options-grid-item--centered" xs={2}>
			{service.hasSync && service.hasAutoSync ? (
				<>
					<ServiceAutoSyncOption sync={sync} autoSync={autoSync} handleChange={handleChange} />
					<ServiceAutoSyncDaysOption
						sync={sync}
						autoSync={autoSync}
						autoSyncDays={autoSyncDays}
						handleChange={handleChange}
					/>
					<ServiceLastSyncOption
						service={service}
						sync={sync}
						autoSync={autoSync}
						lastSync={lastSync}
					/>
				</>
			) : (
				<Tooltip title={I18N.translate('notAvailable')}>
					<BlockIcon fontSize="small" />
				</Tooltip>
			)}
		</Grid>
	);
};

_ServiceAutoSyncOptions.propTypes = {
	service: PropTypes.instanceOf(Service).isRequired,
	sync: PropTypes.bool.isRequired,
	autoSync: PropTypes.bool.isRequired,
	autoSyncDays: PropTypes.number.isRequired,
	lastSync: PropTypes.number.isRequired,
	handleChange: PropTypes.func.isRequired,
};

export const ServiceAutoSyncOptions = React.memo(_ServiceAutoSyncOptions);
