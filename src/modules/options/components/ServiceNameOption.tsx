import { Service } from '@models/Service';
import { Grid, Typography } from '@mui/material';
import { memo } from 'react';

interface ServiceNameOptionProps {
	service: Service;
}

const _ServiceNameOption = ({ service }: ServiceNameOptionProps): JSX.Element => {
	return (
		<Grid size={3}>
			<Typography>{service.name}</Typography>
		</Grid>
	);
};

export const ServiceNameOption = memo(_ServiceNameOption);
