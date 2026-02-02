import { I18N } from '@common/I18N';
import { CenteredGrid } from '@components/CenteredGrid';
import { ServiceAutoSyncDaysOption } from '@components/ServiceAutoSyncDaysOption';
import { ServiceAutoSyncOption } from '@components/ServiceAutoSyncOption';
import { ServiceLastSyncOption } from '@components/ServiceLastSyncOption';
import { Service } from '@models/Service';
import { Block as BlockIcon } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { memo } from 'react';

interface ServiceAutoSyncOptionsProps {
	service: Service;
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	lastSync: number;
	handleChange: (optionId: string, newValue: unknown) => void;
}

export const _ServiceAutoSyncOptions = ({
	service,
	sync,
	autoSync,
	autoSyncDays,
	lastSync,
	handleChange,
}: ServiceAutoSyncOptionsProps): JSX.Element => {
	return (
		<CenteredGrid size={2}>
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
		</CenteredGrid>
	);
};

export const ServiceAutoSyncOptions = memo(_ServiceAutoSyncOptions);
