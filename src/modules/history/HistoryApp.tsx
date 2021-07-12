import { EventDispatcher } from '@common/Events';
import { Session } from '@common/Session';
import { Shared } from '@common/Shared';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { HistoryHeader } from '@components/HistoryHeader';
import { LoginWrapper } from '@components/LoginWrapper';
import { UtsDialog } from '@components/UtsDialog';
import { UtsSnackbar } from '@components/UtsSnackbar';
import { Container } from '@material-ui/core';
import { AutoSyncPage } from '@pages/AutoSyncPage';
import { AboutPage } from '@pages/HistoryAboutPage';
import { HomePage } from '@pages/HistoryHomePage';
import { LoginPage } from '@pages/HistoryLoginPage';
import { SyncPage } from '@pages/SyncPage';
import { streamingServices } from '@streaming-services';
import '@streaming-services-apis';
import { createHashHistory } from 'history';
import * as React from 'react';
import { useEffect, useState } from 'react';
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
			<Container className="history-container">
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
						{Object.values(streamingServices)
							.filter((service) => service.hasSync)
							.map((service) => (
								<Route
									key={service.id}
									path={`/${service.id}`}
									render={LoginWrapper.wrap(() => (
										<SyncPage serviceId={service.id} />
									))}
								/>
							))}
						<Route
							path="/auto-sync"
							render={LoginWrapper.wrap(() => (
								<AutoSyncPage />
							))}
						/>
						<Redirect to="/login" />
					</Switch>
				</Router>
				<UtsDialog />
				<UtsSnackbar />
			</Container>
		</ErrorBoundary>
	);
};
