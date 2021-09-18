import { Service } from '@models/Service';
import { Grid, Typography } from '@mui/material';
import React from 'react';

interface ServiceNameOptionProps {
	service: Service;
}

const _ServiceNameOption: React.FC<ServiceNameOptionProps> = ({
	service,
}: ServiceNameOptionProps) => {
	return (
		<Grid item xs={3}>
			<Typography>{service.name}</Typography>
		</Grid>
	);
};

export const ServiceNameOption = React.memo(_ServiceNameOption);
