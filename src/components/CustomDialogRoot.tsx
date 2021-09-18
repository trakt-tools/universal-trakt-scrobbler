import { Dialog, DialogProps } from '@mui/material';

export interface CustomDialogRootProps extends DialogProps, WithChildren, WithSx {}

export const CustomDialogRoot = ({
	children,
	sx = {},
	...props
}: CustomDialogRootProps): JSX.Element => {
	return (
		<Dialog
			{...props}
			sx={{
				'& .MuiDialog-paper': {
					minWidth: 300,
					minHeight: 150,
				},
				...sx,
			}}
		>
			{children}
		</Dialog>
	);
};
