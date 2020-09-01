import { CircularProgress, List, ListItem, ListItemText, Typography } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { UtsCenter } from '../../../components/UtsCenter';
import { Session } from '../../../common/Session';
import { HistoryInfo } from '../components/HistoryInfo';
import { StreamingServicePage, streamingServicePages } from '../../../streaming-services/pages';
import { BrowserStorage } from '../../../common/BrowserStorage';

export const HomePage: React.FC = () => {
	const history = useHistory();
	const [isLoading, setLoading] = useState(true);
	const [services, setServices] = useState([] as StreamingServicePage[]);

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	useEffect(() => {
		const checkLogin = () => {
			if (Session.isLoggedIn) {
				setLoading(false);
			} else {
				setLoading(true);
				history.push('/login');
			}
		};

		checkLogin();
	}, []);

	useEffect(() => {
		const checkEnabledServices = async () => {
			const storage = await BrowserStorage.get('options');
			const serviceOptions = storage.options?.streamingServices;
			if (!serviceOptions) {
				return;
			}
			const enabledServices = [];
			for (const service of streamingServicePages) {
				if (serviceOptions[service.id]) {
					enabledServices.push(service);
				}
			}
			setServices(enabledServices);
		};

		void checkEnabledServices();
	}, []);

	return isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<HistoryInfo>
			{services.length > 0 ? (
				<>
					<Typography variant="h6">{browser.i18n.getMessage('selectStreamingService')}</Typography>
					<List>
						{services.map((service) => (
							<ListItem
								key={service.id}
								button={true}
								divider={true}
								onClick={() => onRouteClick(service.path)}
							>
								<ListItemText primary={service.name} />
							</ListItem>
						))}
					</List>
				</>
			) : (
				<Typography variant="body1">{browser.i18n.getMessage('noStreamingServices')}</Typography>
			)}
		</HistoryInfo>
	);
};
