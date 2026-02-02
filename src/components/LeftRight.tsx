import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface LeftRightProps extends WithSx {
	centerVertically: boolean;
	left: ReactNode;
	center?: ReactNode;
	right: ReactNode;
}

export const LeftRight = ({
	centerVertically,
	left,
	center,
	right,
	sx = {},
}: LeftRightProps): JSX.Element => {
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
