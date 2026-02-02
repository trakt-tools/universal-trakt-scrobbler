import { Divider, DividerProps } from '@mui/material';

export interface HistoryListItemDividerProps extends DividerProps, WithSx {
	useDarkMode?: boolean;
}

export const HistoryListItemDivider = ({
	useDarkMode,
	sx = {},
	...props
}: HistoryListItemDividerProps): JSX.Element => {
	return (
		<Divider
			{...props}
			sx={{
				width: 1,
				marginY: 1,
				marginX: 0,
				...(useDarkMode
					? {
							borderColor: 'rgba(255, 255, 255, 0.75)',
						}
					: {}),
				...sx,
			}}
		/>
	);
};
