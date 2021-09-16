import { FullView } from '@components/FullView';
import React from 'react';

export interface PopupOverlayProps {
	children?: React.ReactNode;
}

export const PopupOverlay: React.FC = ({ children }: PopupOverlayProps) => {
	return (
		<FullView
			sx={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				color: '#fff',

				'& *': {
					fontSize: '1000%',
				},
			}}
		>
			{children}
		</FullView>
	);
};
