import { AppBar, Button, Toolbar } from '@material-ui/core';
import { History } from 'history';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { UtsLeftRight } from '../../../components/UtsLeftRight';
import { Session } from '../../../common/Session';
import { Tabs } from '../../../common/Tabs';

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
							<Button color="inherit" onClick={() => onRouteClick('/home')}>
								{browser.i18n.getMessage('home')}
							</Button>
							<Button color="inherit" onClick={() => onRouteClick('/about')}>
								{browser.i18n.getMessage('about')}
							</Button>
							<Button
								color="inherit"
								onClick={() => onLinkClick(browser.runtime.getURL('html/history.html'))}
							>
								{browser.i18n.getMessage('history')}
							</Button>
							<Button
								color="inherit"
								onClick={() => onLinkClick(browser.runtime.getURL('html/options.html'))}
							>
								{browser.i18n.getMessage('options')}
							</Button>
						</>
					}
					right={
						isLoggedIn ? (
							<Button color="inherit" onClick={onLogoutClick}>
								{browser.i18n.getMessage('logout')}
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
