import { Grid, GridProps } from '@mui/material';

export interface CenteredGridProps extends GridProps, WithChildren, WithSx {}

export const CenteredGrid = ({ children, sx = {}, ...props }: CenteredGridProps): JSX.Element => {
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
