import { Service } from '@models/Service';
import { Grid, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

interface ServiceNameOptionProps {
	service: Service;
}

const _ServiceNameOption: React.FC<ServiceNameOptionProps> = ({ service }) => {
	return (
		<Grid item xs={3}>
			<Typography>{service.name}</Typography>
		</Grid>
	);
};

_ServiceNameOption.propTypes = {
	service: PropTypes.instanceOf(Service).isRequired,
};

export const ServiceNameOption = React.memo(_ServiceNameOption);
