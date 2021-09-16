import { Box } from '@mui/material';
import React from 'react';

export interface HistoryListItemMessageProps extends WithChildren, WithSx {}

export const HistoryListItemMessage: React.FC<HistoryListItemMessageProps> = ({
	children,
	sx = {},
}: HistoryListItemMessageProps) => {
	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				padding: 2,
				textAlign: 'center',
				...sx,
			}}
		>
			{children}
		</Box>
	);
};
