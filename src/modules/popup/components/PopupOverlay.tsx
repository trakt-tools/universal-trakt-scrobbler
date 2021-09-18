import { FullView } from '@components/FullView';

export interface PopupOverlayProps extends WithChildren {}

export const PopupOverlay = ({ children }: PopupOverlayProps): JSX.Element => {
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
