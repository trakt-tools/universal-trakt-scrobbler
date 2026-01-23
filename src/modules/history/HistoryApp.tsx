import { CustomDialog } from '@components/CustomDialog';
import { CustomSnackbar } from '@components/CustomSnackbar';
import { HistoryContainer } from '@components/HistoryContainer';
import { HistoryHeader } from '@components/HistoryHeader';
import { LoginWrapper } from '@components/LoginWrapper';
import { ServiceLoginWrapper } from '@components/ServiceLoginWrapper';
import { SyncDialog } from '@components/SyncDialog';
import { SyncProvider } from '@contexts/SyncContext';
import { getServices } from '@models/Service';
import { AutoSyncPage } from '@pages/AutoSyncPage';
import { AboutPage } from '@pages/HistoryAboutPage';
import { HomePage } from '@pages/HistoryHomePage';
import { LoginPage } from '@pages/LoginPage';
import { SyncPage } from '@pages/SyncPage';
import '@services-apis';
import { Navigate, Route, Routes } from 'react-router-dom';

export const HistoryApp = (): JSX.Element => {
	return (
		<>
			<CustomDialog />
			<CustomSnackbar />
			<Routes>
				<Route
					path="/login"
					element={
						<>
							<HistoryHeader />
							<HistoryContainer>
								<LoginPage />
							</HistoryContainer>
						</>
					}
				/>
				<Route
					path="/home"
					element={
						<LoginWrapper>
							<HistoryHeader />
							<HistoryContainer>
								<HomePage />
							</HistoryContainer>
						</LoginWrapper>
					}
				/>
				<Route
					path="/about"
					element={
						<>
							<HistoryHeader />
							<HistoryContainer>
								<AboutPage />
							</HistoryContainer>
						</>
					}
				/>
				{getServices()
					.filter((service) => service.hasSync)
					.map((service) => (
						<Route
							key={service.id}
							path={service.path}
							element={
								<LoginWrapper>
									<SyncProvider serviceId={service.id}>
										<SyncDialog />
										<ServiceLoginWrapper>
											<HistoryHeader />
											<HistoryContainer isSync={true} disableGutters={true} maxWidth={false}>
												<SyncPage />
											</HistoryContainer>
										</ServiceLoginWrapper>
									</SyncProvider>
								</LoginWrapper>
							}
						/>
					))}
				<Route
					path="/auto-sync"
					element={
						<LoginWrapper>
							<SyncProvider serviceId={null}>
								<HistoryHeader />
								<HistoryContainer isSync={true} disableGutters={true} maxWidth={false}>
									<AutoSyncPage />
								</HistoryContainer>
							</SyncProvider>
						</LoginWrapper>
					}
				/>
				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</>
	);
};
