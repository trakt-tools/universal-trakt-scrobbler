import { List, ListItem, ListItemText, Typography } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { getServicePages, StreamingServicePage } from '../../../streaming-services/common/common';
import { HistoryInfo } from '../components/HistoryInfo';

export const HomePage: React.FC = () => {
	const history = useHistory();
	const [services, setServices] = useState([] as StreamingServicePage[]);

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	useEffect(() => {
		const checkEnabledServices = () => {
			const serviceOptions = BrowserStorage.options.streamingServices;
			const enabledServices = [];
			const servicePages = getServicePages();
			for (const service of servicePages) {
				if (service.hasSync && serviceOptions[service.id].sync) {
					enabledServices.push(service);
				}
			}
			setServices(enabledServices);
		};

		checkEnabledServices();
	}, []);

	return (
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
