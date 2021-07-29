import { HistoryHeader } from '@components/HistoryHeader';
import { LoginWrapper } from '@components/LoginWrapper';
import { ServiceLoginWrapper } from '@components/ServiceLoginWrapper';
import { UtsDialog } from '@components/UtsDialog';
import { UtsSnackbar } from '@components/UtsSnackbar';
import { useHistory } from '@contexts/HistoryContext';
import { SyncProvider } from '@contexts/SyncContext';
import { Container } from '@material-ui/core';
import { getServices } from '@models/Service';
import { AutoSyncPage } from '@pages/AutoSyncPage';
import { AboutPage } from '@pages/HistoryAboutPage';
import { HomePage } from '@pages/HistoryHomePage';
import { LoginPage } from '@pages/LoginPage';
import { SyncPage } from '@pages/SyncPage';
import '@services-apis';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

export const HistoryApp: React.FC = () => {
	const history = useHistory();

	return (
		<>
			<HistoryHeader />
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
						render={() => (
							<LoginWrapper>
								<Container className="history-container">
									<HomePage />
								</Container>
							</LoginWrapper>
						)}
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
								render={() => (
									<LoginWrapper>
										<Container
											className="history-container history-container--sync"
											maxWidth={false}
										>
											<SyncProvider serviceId={service.id}>
												<ServiceLoginWrapper>
													<SyncPage />
												</ServiceLoginWrapper>
											</SyncProvider>
										</Container>
									</LoginWrapper>
								)}
							/>
						))}
					<Route
						path="/auto-sync"
						render={() => (
							<LoginWrapper>
								<Container className="history-container history-container--sync" maxWidth={false}>
									<SyncProvider serviceId={null}>
										<AutoSyncPage />
									</SyncProvider>
								</Container>
							</LoginWrapper>
						)}
					/>
					<Redirect to="/login" />
				</Switch>
			</Router>
			<UtsDialog />
			<UtsSnackbar />
		</>
	);
};
