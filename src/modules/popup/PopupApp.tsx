import { FullView } from '@components/FullView';
import { LoginWrapper } from '@components/LoginWrapper';
import { PopupHeader } from '@components/PopupHeader';
import { PopupOverlay } from '@components/PopupOverlay';
import { useHistory } from '@contexts/HistoryContext';
import BackgroundImage from '@images/background.jpg';
import { Box } from '@mui/material';
import { LoginPage } from '@pages/LoginPage';
import { AboutPage } from '@pages/PopupAboutPage';
import { HomePage } from '@pages/PopupHomePage';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

export const PopupApp = (): JSX.Element => {
	const history = useHistory();

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
					<Router history={history}>
						<Switch>
							<Route path="/login" render={() => <LoginPage />} />
							<Route
								path="/home"
								render={() => (
									<LoginWrapper>
										<HomePage />
									</LoginWrapper>
								)}
							/>
							<Route path="/about" render={() => <AboutPage />} />
							<Redirect to="/login" />
						</Switch>
					</Router>
				</Box>
			</Box>
		</>
	);
};
