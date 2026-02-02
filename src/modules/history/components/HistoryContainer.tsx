import { Container, ContainerProps } from '@mui/material';

export interface HistoryContainerProps extends ContainerProps, WithChildren, WithSx {
	isSync?: boolean;
}

export const HistoryContainer = ({
	children,
	isSync,
	sx = {},
	...props
}: HistoryContainerProps): JSX.Element => {
	return (
		<Container
			{...props}
			sx={{
				paddingTop: 2,
				...(isSync
					? {
							display: 'flex',
							flex: 1,
							flexDirection: 'column',
							padding: 0,
						}
					: {}),
				...sx,
			}}
		>
			{children}
		</Container>
	);
};
