import { AppBar, Button, Toolbar } from '@material-ui/core';
import { History } from 'history';
import * as React from 'react';
import { I18N } from '../../../common/I18N';
import { Session } from '../../../common/Session';
import { Tabs } from '../../../common/Tabs';
import { UtsLeftRight } from '../../../components/UtsLeftRight';

interface HistoryHeaderProps {
	history: History;
	isLoggedIn: boolean;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = (props: HistoryHeaderProps) => {
	const { history, isLoggedIn } = props;

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
		<AppBar className="history-header" position="sticky">
			<Toolbar>
				<UtsLeftRight
					centerVertically={true}
					left={
						<>
							<Button color="inherit" onClick={() => onRouteClick('/home')}>
								{I18N.translate('home')}
							</Button>
							<Button color="inherit" onClick={() => onRouteClick('/about')}>
								{I18N.translate('about')}
							</Button>
							<Button
								color="inherit"
								onClick={() => onLinkClick(browser.runtime.getURL('/html/options.html'))}
							>
								{I18N.translate('options')}
							</Button>
						</>
					}
					right={
						isLoggedIn ? (
							<Button color="inherit" onClick={onLogoutClick}>
								{I18N.translate('logout')}
							</Button>
						) : undefined
					}
				/>
			</Toolbar>
		</AppBar>
	);
};
