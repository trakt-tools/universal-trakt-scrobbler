import { CircularProgress, List, ListItem, ListItemText, Typography } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { Session } from '../../../common/Session';
import { UtsCenter } from '../../../components/UtsCenter';
import { StreamingServicePage, streamingServicePages } from '../../../streaming-services/pages';
import { HistoryInfo } from '../components/HistoryInfo';

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
		const checkEnabledServices = () => {
			const serviceOptions = BrowserStorage.options.streamingServices;
			const enabledServices = [];
			for (const service of streamingServicePages) {
				if (service.hasSync && serviceOptions[service.id].sync) {
					enabledServices.push(service);
				}
			}
			setServices(enabledServices);
		};

		checkEnabledServices();
	}, []);

	return isLoading ? (
		<UtsCenter>
			<CircularProgress />
		</UtsCenter>
	) : (
		<HistoryInfo>
			{services.length > 0 ? (
				<>
					<Typography variant="h6">{I18N.translate('selectStreamingService')}</Typography>
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
				<Typography variant="body1">{I18N.translate('noStreamingServices')}</Typography>
			)}
		</HistoryInfo>
	);
};
