import { Box } from '@mui/material';

export interface FullViewProps extends WithChildren, WithSx {}

export const FullView = ({ children, sx = {} }: FullViewProps): JSX.Element => {
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
