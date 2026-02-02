import { FullView } from '@components/FullView';
import { LoginWrapper } from '@components/LoginWrapper';
import { PopupHeader } from '@components/PopupHeader';
import { PopupOverlay } from '@components/PopupOverlay';
import BackgroundImage from '@images/background.jpg';
import { Box } from '@mui/material';
import { LoginPage } from '@pages/LoginPage';
import { AboutPage } from '@pages/PopupAboutPage';
import { HomePage } from '@pages/PopupHomePage';
import { Navigate, Route, Routes } from 'react-router-dom';

export const PopupApp = (): JSX.Element => {
	return (
		<>
			<PopupHeader />
			<Box
				sx={{
					position: 'relative',
					width: 400,
					height: 200,
				}}
			>
				<FullView
					sx={{
						backgroundImage: `url("${BackgroundImage}")`,
						filter: 'blur(1px) grayscale(0.5)',
					}}
				/>
				<PopupOverlay />
				<Box
					sx={{
						position: 'relative',
						height: 1,

						'& > *': {
							height: 1,
						},
					}}
				>
					<Routes>
						<Route path="/login" element={<LoginPage />} />
						<Route
							path="/home"
							element={
								<LoginWrapper>
									<HomePage />
								</LoginWrapper>
							}
						/>
						<Route path="/about" element={<AboutPage />} />
						<Route path="*" element={<Navigate to="/login" replace />} />
					</Routes>
				</Box>
			</Box>
		</>
	);
};
