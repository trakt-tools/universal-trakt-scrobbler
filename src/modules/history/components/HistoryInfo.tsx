import { Center } from '@components/Center';
import { Box } from '@mui/material';

interface HistoryInfoProps extends WithChildren {}

export const HistoryInfo = ({ children }: HistoryInfoProps): JSX.Element => {
	return (
		<Center>
			<Box
				sx={{
					textAlign: 'center',

					'& > *': {
						marginY: 1,
						marginX: 0,
					},
				}}
			>
				{children}
			</Box>
		</Center>
	);
};
