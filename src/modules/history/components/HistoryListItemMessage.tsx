import { Box } from '@mui/material';

export interface HistoryListItemMessageProps extends WithChildren, WithSx {}

export const HistoryListItemMessage = ({
	children,
	sx = {},
}: HistoryListItemMessageProps): JSX.Element => {
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
