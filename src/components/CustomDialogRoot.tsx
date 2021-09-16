import { Dialog, DialogProps } from '@mui/material';
import React from 'react';

export interface CustomDialogRootProps extends DialogProps, WithChildren, WithSx {}

export const CustomDialogRoot: React.FC<CustomDialogRootProps> = ({
	children,
	sx = {},
	...props
}: CustomDialogRootProps) => {
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
