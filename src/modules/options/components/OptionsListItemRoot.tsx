import { ListItem, ListItemProps } from '@mui/material';

export interface OptionsListItemRootProps extends ListItemProps, WithChildren, WithSx {}

export const OptionsListItemRoot = ({
	children,
	sx = {},
	...props
}: OptionsListItemRootProps): JSX.Element => {
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
