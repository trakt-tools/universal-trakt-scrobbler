import { Center } from '@components/Center';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

export const PopupInfo: React.FC = ({ children }) => {
	return (
		<Center>
			<Box
				sx={{
					color: '#fff',
					textAlign: 'center',

					'& > *:not(.MuiLinearProgress-root)': {
						marginY: 1,
						marginX: 0,
					},
				}}
			>
				{children}
			</Box>
		</Center>
	);
};

PopupInfo.propTypes = {
	children: PropTypes.node.isRequired,
};
