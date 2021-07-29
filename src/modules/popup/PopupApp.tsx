import { LoginWrapper } from '@components/LoginWrapper';
import { PopupHeader } from '@components/PopupHeader';
import { useHistory } from '@contexts/HistoryContext';
import { Box } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import { LoginPage } from '@pages/LoginPage';
import { AboutPage } from '@pages/PopupAboutPage';
import { HomePage } from '@pages/PopupHomePage';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

export const PopupApp: React.FC = () => {
	const history = useHistory();
	const theme = useTheme();

	return (
		<>
			<PopupHeader />
			<Box className={`popup-container ${theme.palette.type}`}>
				<Box className="popup-container--overlay-image" />
				<Box className="popup-container--overlay-color" />
				<Box className="popup-container--content">
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
