import { I18N } from '@common/I18N';
import { Session } from '@common/Session';
import { Tabs } from '@common/Tabs';
import { UtsLeftRight } from '@components/UtsLeftRight';
import { useHistory } from '@contexts/HistoryContext';
import { useSession } from '@contexts/SessionContext';
import { useSync } from '@contexts/SyncContext';
import { AppBar, Box, Button, Toolbar, Tooltip, Typography } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import HomeIcon from '@material-ui/icons/Home';
import InfoIcon from '@material-ui/icons/Info';
import SettingsIcon from '@material-ui/icons/Settings';
import React from 'react';
import { browser } from 'webextension-polyfill-ts';

export const HistoryHeader: React.FC = () => {
	const history = useHistory();
	const { isLoggedIn } = useSession();
	const { serviceId, service, api } = useSync();
	const theme = useTheme();

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
			className="history-header"
			position="sticky"
			style={{ zIndex: theme.zIndex.drawer + 1 }}
		>
			<Toolbar>
				<UtsLeftRight
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
								onClick={() => onLinkClick(browser.runtime.getURL('options.html'))}
								startIcon={<SettingsIcon />}
							>
								{I18N.translate('options')}
							</Button>
						</>
					}
					middle={
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
								<Button color="inherit" onClick={onLogoutClick} startIcon={<ExitToAppIcon />}>
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
