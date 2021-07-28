import { EventDispatcher } from '@common/Events';
import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { HistoryHeader } from '@components/HistoryHeader';
import { LoginWrapper } from '@components/LoginWrapper';
import { UtsDialog } from '@components/UtsDialog';
import { UtsSnackbar } from '@components/UtsSnackbar';
import { Container } from '@material-ui/core';
import { getServices } from '@models/Service';
import { AutoSyncPage } from '@pages/AutoSyncPage';
import { AboutPage } from '@pages/HistoryAboutPage';
import { HomePage } from '@pages/HistoryHomePage';
import { LoginPage } from '@pages/HistoryLoginPage';
import { SyncPage } from '@pages/SyncPage';
import '@services-apis';
import { createHashHistory } from 'history';
import React, { useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

const history = createHashHistory();
Shared.history = history;

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
			<Router history={history}>
				<Switch>
					<Route
						path="/login"
						render={() => (
							<Container className="history-container">
								<LoginPage />
							</Container>
						)}
					/>
					<Route
						path="/home"
						render={LoginWrapper.wrap(() => (
							<Container className="history-container">
								<HomePage />
							</Container>
						))}
					/>
					<Route
						path="/about"
						render={() => (
							<Container className="history-container">
								<AboutPage />
							</Container>
						)}
					/>
					{getServices()
						.filter((service) => service.hasSync)
						.map((service) => (
							<Route
								key={service.id}
								path={service.path}
								render={LoginWrapper.wrap(() => (
									<Container className="history-container history-container--sync" maxWidth={false}>
										<SyncPage serviceId={service.id} />
									</Container>
								))}
							/>
						))}
					<Route
						path="/auto-sync"
						render={LoginWrapper.wrap(() => (
							<Container className="history-container history-container--sync" maxWidth={false}>
								<AutoSyncPage />
							</Container>
						))}
					/>
					<Redirect to="/login" />
				</Switch>
			</Router>
			<UtsDialog />
			<UtsSnackbar />
		</ErrorBoundary>
	);
};
