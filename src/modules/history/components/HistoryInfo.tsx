import { Center } from '@components/Center';
import { Box } from '@mui/material';
import React from 'react';

interface HistoryInfoProps {
	children?: React.ReactNode;
}

export const HistoryInfo: React.FC<HistoryInfoProps> = ({ children }: HistoryInfoProps) => {
	return (
		<Center>
			<Box
				sx={{
					textAlign: 'center',

					'& > *': {
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
