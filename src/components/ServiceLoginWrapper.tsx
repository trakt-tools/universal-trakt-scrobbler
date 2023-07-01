import { AutoSync } from '@common/AutoSync';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Center } from '@components/Center';
import { HistoryOptionsList } from '@components/HistoryOptionsList';
import { useHistory } from '@contexts/HistoryContext';
import { useSync } from '@contexts/SyncContext';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export interface ServiceLoginWrapperProps extends WithChildren {}

export const ServiceLoginWrapper = ({ children }: ServiceLoginWrapperProps): JSX.Element => {
	const history = useHistory();
	const { service, api } = useSync();

	const [isLoading, setLoading] = useState(true);

	useEffect(() => {
		const checkLogin = async () => {
			if (!service || !api) {
				setLoading(false);
				return;
			}
			try {
				const isLoggedIn = await api.checkLogin();
				if (!isLoggedIn) {
					throw new Error('Not logged in');
				}
				setLoading(false);
			} catch (err) {
				history.push('/home');
				await Shared.events.dispatch('DIALOG_SHOW', null, {
					title: I18N.translate('notLoggedIn'),
					message: (
						<>
							{I18N.translate('notLoggedInDescription')}
							<br />
							<br />
							<Link href={service.homePage} target="_blank" rel="noopener">
								{service.homePage}
							</Link>
						</>
					),
				});
			}
		};

		const checkInitialSync = async () => {
			if (!service || !api) {
				setLoading(false);
				return;
			}

			const serviceOptions = Shared.storage.options.services[service.id];
			if (serviceOptions?.lastSync === 0 && !serviceOptions.hasDismissedSync) {
				await Shared.events.dispatch('DIALOG_SHOW', null, {
					title: I18N.translate('initialSyncTitle'),
					message: (
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								gap: 1,
							}}
						>
							{I18N.translate('initialSyncDescription')
								.split('\n')
								.map((paragraph, index) => (
									<Typography key={index}>{paragraph}</Typography>
								))}
							<HistoryOptionsList />
						</Box>
					),
					onConfirm: async () => {
						await Shared.events.dispatch('SYNC_DIALOG_SHOW', null, {
							isAutoSync: true,
							serviceId: service.id,
						});

						try {
							const hasSynced = await AutoSync.forceSync(service);

							await Shared.events.dispatch('SYNC_DIALOG_HIDE', null, {});
							await Shared.events.dispatch('DIALOG_SHOW', null, {
								title: I18N.translate(hasSynced ? 'initialSyncSuccess' : 'initialSyncFailed'),
								message: '',
								onConfirm: () => history.push('/auto-sync'),
								onDeny: () => void checkLogin(),
							});
						} catch (err) {
							void checkLogin();
						}
					},
					onDeny: async () => {
						await Shared.storage.saveOptions({
							services: {
								[service.id]: {
									hasDismissedSync: true,
								},
							},
						});

						void checkLogin();
					},
				});
			} else {
				void checkLogin();
			}
		};

		void checkInitialSync();
	}, []);

	return isLoading ? (
		<Center>
			<CircularProgress />
		</Center>
	) : (
		<>{children}</>
	);
};
