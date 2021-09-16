import { BrowserStorage } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { Session } from '@common/Session';
import { Tabs } from '@common/Tabs';
import { LeftRight } from '@components/LeftRight';
import { useHistory } from '@contexts/HistoryContext';
import { useSession } from '@contexts/SessionContext';
import {
	ExitToApp as ExitToAppIcon,
	History as HistoryIcon,
	Home as HomeIcon,
	Info as InfoIcon,
	Settings as SettingsIcon,
	Sync as SyncIcon,
} from '@mui/icons-material';
import { AppBar, IconButton, Toolbar, Tooltip } from '@mui/material';
import React from 'react';
import { browser } from 'webextension-polyfill-ts';

export const PopupHeader: React.FC = () => {
	const [syncButton, setSyncButton] = React.useState({
		isEnabled: false,
		hasError: false,
	});

	const history = useHistory();
	const { isLoggedIn } = useSession();

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	const onLogoutClick = async (): Promise<void> => {
		await Session.logout();
	};

	React.useEffect(() => {
		const checkAutoSync = async () => {
			const { syncCache } = await BrowserStorage.get('syncCache');
			if (syncCache && syncCache.items.length > 0) {
				setSyncButton({
					isEnabled: true,
					hasError: syncCache.failed,
				});
			}
		};

		void checkAutoSync();
	}, []);

	return (
		<AppBar
			position="sticky"
			sx={{
				color: '#fff',
			}}
		>
			<Toolbar>
				<LeftRight
					centerVertically={true}
					left={
						<>
							<Tooltip title={I18N.translate('home')}>
								<IconButton color="inherit" onClick={() => onRouteClick('/home')}>
									<HomeIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title={I18N.translate('about')}>
								<IconButton color="inherit" onClick={() => onRouteClick('/about')}>
									<InfoIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title={I18N.translate('history')}>
								<IconButton
									color="inherit"
									onClick={() => onLinkClick(browser.runtime.getURL('history.html'))}
								>
									<HistoryIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title={I18N.translate('options')}>
								<IconButton
									color="inherit"
									onClick={() => onLinkClick(browser.runtime.getURL('options.html'))}
								>
									<SettingsIcon />
								</IconButton>
							</Tooltip>
							{syncButton.isEnabled && (
								<Tooltip
									title={I18N.translate(
										syncButton.hasError ? 'recentAutoSyncError' : 'recentAutoSync'
									)}
								>
									<IconButton
										color="inherit"
										onClick={() => onLinkClick(browser.runtime.getURL('history.html#/auto-sync'))}
									>
										<SyncIcon color={syncButton.hasError ? 'secondary' : 'inherit'} />
									</IconButton>
								</Tooltip>
							)}
						</>
					}
					right={
						<>
							{isLoggedIn && (
								<Tooltip title={I18N.translate('logout')}>
									<IconButton color="inherit" onClick={onLogoutClick}>
										<ExitToAppIcon />
									</IconButton>
								</Tooltip>
							)}
						</>
					}
				/>
			</Toolbar>
		</AppBar>
	);
};
