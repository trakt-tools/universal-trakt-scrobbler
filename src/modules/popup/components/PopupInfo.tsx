import { Center } from '@components/Center';
import { Box } from '@mui/material';
import React from 'react';

export interface PopupInfoProps extends WithChildren {}

export const PopupInfo: React.FC = ({ children }: PopupInfoProps) => {
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
