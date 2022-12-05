import { I18N } from '@common/I18N';
import { Session } from '@common/Session';
import { Tabs } from '@common/Tabs';
import { LeftRight } from '@components/LeftRight';
import { useHistory } from '@contexts/HistoryContext';
import { useSession } from '@contexts/SessionContext';
import { useSync } from '@contexts/SyncContext';
import {
	ExitToApp as ExitToAppIcon,
	Home as HomeIcon,
	Info as InfoIcon,
	Settings as SettingsIcon,
} from '@mui/icons-material';
import { AppBar, Box, Button, Toolbar, Tooltip, Typography } from '@mui/material';
import browser from 'webextension-polyfill';

export const HistoryHeader = (): JSX.Element => {
	const history = useHistory();
	const { isLoggedIn } = useSession();
	const { serviceId, service, api } = useSync();

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	const onLogoutClick = async () => {
		await Session.logout();
	};

	return (
		<AppBar
			position="sticky"
			sx={{
				zIndex: ({ zIndex }) => zIndex.drawer + 1,
				color: '#fff',
			}}
		>
			<Toolbar>
				<LeftRight
					centerVertically={true}
					left={
						<>
							<Button
								color="inherit"
								onClick={() => onRouteClick('/home')}
								startIcon={<HomeIcon />}
							>
								{I18N.translate('home')}
							</Button>
							<Button
								color="inherit"
								onClick={() => onRouteClick('/about')}
								startIcon={<InfoIcon />}
							>
								{I18N.translate('about')}
							</Button>
							<Button
								color="inherit"
								onClick={() => void onLinkClick(browser.runtime.getURL('options.html'))}
								startIcon={<SettingsIcon />}
							>
								{I18N.translate('options')}
							</Button>
						</>
					}
					center={
						<Typography variant="overline">
							{serviceId !== null ? (
								service ? (
									<>
										{I18N.translate('historyFor')}{' '}
										<Box display="inline" fontWeight="fontWeightBold">
											{service.name}
										</Box>
										, {I18N.translate('profile')}:{' '}
										<Tooltip title={I18N.translate('profileDescription')}>
											<Box display="inline" fontWeight="fontWeightBold">
												{api?.session?.profileName || I18N.translate('unknown')}
											</Box>
										</Tooltip>
									</>
								) : (
									I18N.translate('history')
								)
							) : (
								I18N.translate('autoSync')
							)}
						</Typography>
					}
					right={
						<>
							{isLoggedIn && (
								<Button
									color="inherit"
									onClick={() => void onLogoutClick()}
									startIcon={<ExitToAppIcon />}
								>
									{I18N.translate('logout')}
								</Button>
							)}
						</>
					}
				/>
			</Toolbar>
		</AppBar>
	);
};
