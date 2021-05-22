import { Box } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import { createHashHistory } from 'history';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import { EventDispatcher } from '../../common/Events';
import { Session } from '../../common/Session';
import { Shared } from '../../common/Shared';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LoginWrapper } from '../../components/LoginWrapper';
import { PopupHeader } from './components/PopupHeader';
import { AboutPage } from './pages/AboutPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

const history = createHashHistory();
Shared.history = history;

export const PopupApp: React.FC = () => {
	const [isLoggedIn, setLoggedIn] = useState(Session.isLoggedIn);
	const theme = useTheme();

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('LOGIN_SUCCESS', null, onLogin);
			EventDispatcher.subscribe('LOGOUT_SUCCESS', null, onLogout);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('LOGIN_SUCCESS', null, onLogin);
			EventDispatcher.unsubscribe('LOGOUT_SUCCESS', null, onLogout);
		};

		const onLogin = () => {
			setLoggedIn(true);
		};

		const onLogout = () => {
			setLoggedIn(false);
			history.push('/login');
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<ErrorBoundary>
			<PopupHeader history={history} isLoggedIn={isLoggedIn} />
			<Box className={`popup-container ${theme.palette.type}`}>
				<Box className="popup-container--overlay-image" />
				<Box className="popup-container--overlay-color" />
				<Box className="popup-container--content">
					<Router history={history}>
						<Switch>
							<Route path="/login" render={() => <LoginPage />} />
							<Route
								path="/home"
								render={LoginWrapper.wrap(() => (
									<HomePage />
								))}
							/>
							<Route path="/about" render={() => <AboutPage />} />
							<Redirect to="/login" />
						</Switch>
					</Router>
				</Box>
			</Box>
		</ErrorBoundary>
	);
};
