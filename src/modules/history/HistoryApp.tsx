import { CustomDialog } from '@components/CustomDialog';
import { CustomSnackbar } from '@components/CustomSnackbar';
import { HistoryContainer } from '@components/HistoryContainer';
import { HistoryHeader } from '@components/HistoryHeader';
import { LoginWrapper } from '@components/LoginWrapper';
import { ServiceLoginWrapper } from '@components/ServiceLoginWrapper';
import { useHistory } from '@contexts/HistoryContext';
import { SyncProvider } from '@contexts/SyncContext';
import { getServices } from '@models/Service';
import { AutoSyncPage } from '@pages/AutoSyncPage';
import { AboutPage } from '@pages/HistoryAboutPage';
import { HomePage } from '@pages/HistoryHomePage';
import { LoginPage } from '@pages/LoginPage';
import { SyncPage } from '@pages/SyncPage';
import '@services-apis';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

export const HistoryApp = (): JSX.Element => {
	const history = useHistory();

	return (
		<>
			<Router history={history}>
				<Switch>
					<Route
						path="/login"
						render={() => (
							<>
								<HistoryHeader />
								<HistoryContainer>
									<LoginPage />
								</HistoryContainer>
							</>
						)}
					/>
					<Route
						path="/home"
						render={() => (
							<LoginWrapper>
								<HistoryHeader />
								<HistoryContainer>
									<HomePage />
								</HistoryContainer>
							</LoginWrapper>
						)}
					/>
					<Route
						path="/about"
						render={() => (
							<>
								<HistoryHeader />
								<HistoryContainer>
									<AboutPage />
								</HistoryContainer>
							</>
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
										<SyncProvider serviceId={service.id}>
											<ServiceLoginWrapper>
												<HistoryHeader />
												<HistoryContainer isSync={true} disableGutters={true} maxWidth={false}>
													<SyncPage />
												</HistoryContainer>
											</ServiceLoginWrapper>
										</SyncProvider>
									</LoginWrapper>
								)}
							/>
						))}
					<Route
						path="/auto-sync"
						render={() => (
							<LoginWrapper>
								<SyncProvider serviceId={null}>
									<HistoryHeader />
									<HistoryContainer isSync={true} disableGutters={true} maxWidth={false}>
										<AutoSyncPage />
									</HistoryContainer>
								</SyncProvider>
							</LoginWrapper>
						)}
					/>
					<Redirect to="/login" />
				</Switch>
			</Router>
			<CustomDialog />
			<CustomSnackbar />
		</>
	);
};
