import { AppBar, IconButton, Toolbar, Tooltip } from '@material-ui/core';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import HistoryIcon from '@material-ui/icons/History';
import HomeIcon from '@material-ui/icons/Home';
import InfoIcon from '@material-ui/icons/Info';
import SettingsIcon from '@material-ui/icons/Settings';
import SyncIcon from '@material-ui/icons/Sync';
import { History } from 'history';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { Session } from '../../../common/Session';
import { Tabs } from '../../../common/Tabs';
import { UtsLeftRight } from '../../../components/UtsLeftRight';

interface IPopupHeader {
	history: History;
	isLoggedIn: boolean;
}

export const PopupHeader: React.FC<IPopupHeader> = ({ history, isLoggedIn }) => {
	const [syncButton, setSyncButton] = React.useState({
		isEnabled: false,
		hasError: false,
	});

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
									onClick={() => onLinkClick(browser.runtime.getURL('html/history.html'))}
								>
									<HistoryIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title={I18N.translate('options')}>
								<IconButton
									color="inherit"
									onClick={() => onLinkClick(browser.runtime.getURL('html/options.html'))}
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
										onClick={() =>
											onLinkClick(browser.runtime.getURL('html/history.html?auto_sync=true'))
										}
									>
										<SyncIcon color={syncButton.hasError ? 'secondary' : 'inherit'} />
									</IconButton>
								</Tooltip>
							)}
						</>
					}
					right={
						isLoggedIn ? (
							<Tooltip title={I18N.translate('logout')}>
								<IconButton color="inherit" onClick={onLogoutClick}>
									<ExitToAppIcon />
								</IconButton>
							</Tooltip>
						) : undefined
					}
				/>
			</Toolbar>
		</AppBar>
	);
};

PopupHeader.propTypes = {
	history: PropTypes.any.isRequired,
	isLoggedIn: PropTypes.bool.isRequired,
};
