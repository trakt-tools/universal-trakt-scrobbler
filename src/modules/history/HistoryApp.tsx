import { Container } from '@material-ui/core';
import { createBrowserHistory } from 'history';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import { EventDispatcher } from '../../common/Events';
import { Session } from '../../common/Session';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { UtsDialog } from '../../components/UtsDialog';
import { UtsSnackbar } from '../../components/UtsSnackbar';
import { streamingServicePages } from '../../streaming-services/pages';
import { HistoryHeader } from './components/HistoryHeader';
import { AboutPage } from './pages/AboutPage';
import { AutoSyncPage } from './pages/AutoSyncPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

const history = createBrowserHistory();

export const HistoryApp: React.FC = () => {
	const [isLoggedIn, setLoggedIn] = useState(Session.isLoggedIn);

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
			<HistoryHeader history={history} isLoggedIn={isLoggedIn} />
			<Container className="history-container">
				<Router history={history}>
					<Switch>
						<Route component={LoginPage} path="/login" />
						<Route component={HomePage} path="/home" />
						<Route component={AboutPage} path="/about" />
						{streamingServicePages.map((service) => (
							<Route key={service.id} component={service.pageBuilder} path={service.path} />
						))}
						<Route component={AutoSyncPage} path="/auto-sync" />
						<Redirect
							to={{
								pathname: '/login',
								search: window.location.search,
							}}
						/>
					</Switch>
				</Router>
				<UtsDialog />
				<UtsSnackbar />
			</Container>
		</ErrorBoundary>
	);
};
