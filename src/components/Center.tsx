import { Box } from '@mui/material';
import React from 'react';

interface CenterProps extends WithChildren, WithSx {
	isHorizontal?: boolean;
}

export const Center: React.FC<CenterProps> = ({
	children,
	isHorizontal = true,
	sx = {},
}: CenterProps) => {
	return (
		<Box
			sx={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				...(isHorizontal
					? {
							height: 1,
					  }
					: {
							flexDirection: 'column',
							width: 1,
					  }),
				...sx,
			}}
		>
			{children}
		</Box>
	);
};
