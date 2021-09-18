import { CenteredGrid } from '@components/CenteredGrid';
import { ServiceAutoSyncOptions } from '@components/ServiceAutoSyncOptions';
import { ServiceNameOption } from '@components/ServiceNameOption';
import { ServiceScrobbleOption } from '@components/ServiceScrobbleOption';
import { ServiceSyncOption } from '@components/ServiceSyncOption';
import { Service } from '@models/Service';
import { Grid } from '@mui/material';
import React from 'react';

interface ServiceOptionRowProps {
	service: Service;
	scrobble: boolean;
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	lastSync: number;
	handleChange: (optionId: string, newValue: unknown) => void;
}

const _ServiceOptionRow: React.FC<ServiceOptionRowProps> = ({
	service,
	scrobble,
	sync,
	autoSync,
	autoSyncDays,
	lastSync,
	handleChange,
}: ServiceOptionRowProps) => {
	return (
		<Grid
			item
			xs={12}
			sx={{
				overflow: 'hidden',
			}}
		>
			<CenteredGrid container spacing={10}>
				<ServiceNameOption service={service} />
				<ServiceScrobbleOption service={service} scrobble={scrobble} handleChange={handleChange} />
				<ServiceSyncOption service={service} sync={sync} handleChange={handleChange} />
				<ServiceAutoSyncOptions
					service={service}
					sync={sync}
					autoSync={autoSync}
					autoSyncDays={autoSyncDays}
					lastSync={lastSync}
					handleChange={handleChange}
				/>
			</CenteredGrid>
		</Grid>
	);
};

export const ServiceOptionRow = React.memo(_ServiceOptionRow);
