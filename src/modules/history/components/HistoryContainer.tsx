import { Container, ContainerProps } from '@mui/material';
import React from 'react';

export interface HistoryContainerProps extends ContainerProps, WithChildren, WithSx {
	isSync?: boolean;
}

export const HistoryContainer: React.FC<HistoryContainerProps> = ({
	children,
	isSync,
	sx = {},
	...props
}: HistoryContainerProps) => {
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
			}}
		>
			{children}
		</Container>
	);
};
