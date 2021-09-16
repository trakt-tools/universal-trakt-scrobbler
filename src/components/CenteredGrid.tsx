import { Grid, GridProps } from '@mui/material';
import React from 'react';

export interface CenteredGridProps extends GridProps, WithChildren, WithSx {}

export const CenteredGrid: React.FC<CenteredGridProps> = ({
	children,
	sx = {},
	...props
}: CenteredGridProps) => {
	return (
		<Grid
			{...props}
			sx={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				...sx,
			}}
		>
			{children}
		</Grid>
	);
};
