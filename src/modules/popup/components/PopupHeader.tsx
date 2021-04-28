import { AppBar, Button, Toolbar } from '@material-ui/core';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import HistoryIcon from '@material-ui/icons/History';
import HomeIcon from '@material-ui/icons/Home';
import InfoIcon from '@material-ui/icons/Info';
import SettingsIcon from '@material-ui/icons/Settings';
import { History } from 'history';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { I18N } from '../../../common/I18N';
import { Session } from '../../../common/Session';
import { Tabs } from '../../../common/Tabs';
import { UtsLeftRight } from '../../../components/UtsLeftRight';

interface IPopupHeader {
	history: History;
	isLoggedIn: boolean;
}

export const PopupHeader: React.FC<IPopupHeader> = ({ history, isLoggedIn }) => {
	const onRouteClick = (path: string) => {
		history.push(path);
	};

	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	const onLogoutClick = async (): Promise<void> => {
		await Session.logout();
	};

	return (
		<AppBar className="popup-header" position="sticky">
			<Toolbar>
				<UtsLeftRight
					centerVertically={true}
					left={
						<>
							<Button
								color="inherit"
								title={I18N.translate('home')}
								onClick={() => onRouteClick('/home')}
							>
								<HomeIcon />
							</Button>
							<Button
								color="inherit"
								title={I18N.translate('about')}
								onClick={() => onRouteClick('/about')}
							>
								<InfoIcon />
							</Button>
							<Button
								color="inherit"
								title={I18N.translate('history')}
								onClick={() => onLinkClick(browser.runtime.getURL('html/history.html'))}
							>
								<HistoryIcon />
							</Button>
							<Button
								color="inherit"
								title={I18N.translate('options')}
								onClick={() => onLinkClick(browser.runtime.getURL('html/options.html'))}
							>
								<SettingsIcon />
							</Button>
						</>
					}
					right={
						isLoggedIn ? (
							<Button color="inherit" title={I18N.translate('logout')} onClick={onLogoutClick}>
								<ExitToAppIcon />
							</Button>
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
