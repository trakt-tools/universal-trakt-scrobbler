import { Center } from '@components/Center';
import { Box } from '@mui/material';

export interface PopupInfoProps extends WithChildren {}

export const PopupInfo = ({ children }: PopupInfoProps): JSX.Element => {
	return (
		<Center>
			<Box
				sx={{
					color: '#fff',
					textAlign: 'center',

					'& > *:not(.MuiLinearProgress-root)': {
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
