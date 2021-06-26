import { List, ListItem, ListItemText, Typography } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import {
	StreamingService,
	streamingServices,
} from '../../../streaming-services/streaming-services';
import { HistoryInfo } from '../components/HistoryInfo';

export const HomePage: React.FC = () => {
	const history = useHistory();
	const [services, setServices] = useState([] as StreamingService[]);

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	useEffect(() => {
		const checkEnabledServices = () => {
			const serviceOptions = BrowserStorage.options.streamingServices;
			const enabledServices = Object.values(streamingServices).filter(
				(service) => service.hasSync && serviceOptions[service.id].sync
			);
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
								onClick={() => onRouteClick(`/${service.id}`)}
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
