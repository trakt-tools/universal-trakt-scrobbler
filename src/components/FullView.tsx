import { Box } from '@mui/material';
import React from 'react';

export interface FullViewProps extends WithChildren, WithSx {}

export const FullView: React.FC<FullViewProps> = ({ children, sx = {} }: FullViewProps) => {
	return (
		<Box
			sx={{
				position: 'absolute',
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				...sx,
			}}
		>
			{children}
		</Box>
	);
};
