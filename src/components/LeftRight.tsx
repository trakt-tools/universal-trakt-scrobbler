import { Box } from '@mui/material';
import React from 'react';

interface LeftRightProps extends WithSx {
	centerVertically: boolean;
	left: React.ReactNode;
	center?: React.ReactNode;
	right: React.ReactNode;
}

export const LeftRight: React.FC<LeftRightProps> = ({
	centerVertically,
	left,
	center,
	right,
	sx = {},
}: LeftRightProps) => {
	return (
		<Box
			sx={{
				display: 'flex',
				width: 1,
				...(centerVertically
					? {
							alignItems: 'center',
					  }
					: {}),
				...sx,
			}}
		>
			<Box
				sx={{
					flex: 1,
				}}
			>
				{left}
			</Box>
			{center && (
				<Box
					sx={{
						textAlign: 'center',
					}}
				>
					{center}
				</Box>
			)}
			<Box
				sx={{
					textAlign: 'right',
					...(center
						? {
								flex: 1,
						  }
						: {}),
				}}
			>
				{right}
			</Box>
		</Box>
	);
};
