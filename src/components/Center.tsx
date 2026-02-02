import { Box } from '@mui/material';

interface CenterProps extends WithChildren, WithSx {
	isHorizontal?: boolean;
}

export const Center = ({ children, isHorizontal = true, sx = {} }: CenterProps): JSX.Element => {
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
