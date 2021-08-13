import { BrowserStorage } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { Session } from '@common/Session';
import { Tabs } from '@common/Tabs';
import { UtsLeftRight } from '@components/UtsLeftRight';
import { useHistory } from '@contexts/HistoryContext';
import { useSession } from '@contexts/SessionContext';
import { AppBar, IconButton, Toolbar, Tooltip } from '@material-ui/core';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import HistoryIcon from '@material-ui/icons/History';
import HomeIcon from '@material-ui/icons/Home';
import InfoIcon from '@material-ui/icons/Info';
import SettingsIcon from '@material-ui/icons/Settings';
import SyncIcon from '@material-ui/icons/Sync';
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
		<AppBar className="popup-header" position="sticky">
			<Toolbar>
				<UtsLeftRight
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
