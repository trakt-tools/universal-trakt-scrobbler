import { ListItem, ListItemProps } from '@mui/material';
import React from 'react';

export interface OptionsListItemRootProps extends ListItemProps, WithChildren, WithSx {}

export const OptionsListItemRoot: React.FC<OptionsListItemRootProps> = ({
	children,
	sx = {},
	...props
}: OptionsListItemRootProps) => {
	return (
		<ListItem
			{...props}
			sx={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',

				'& .MuiListItem-secondaryAction': {
					paddingRight: 8,
				},

				...sx,
			}}
		>
			{children}
		</ListItem>
	);
};
