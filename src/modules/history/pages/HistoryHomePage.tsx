import { BrowserStorage } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { HistoryInfo } from '@components/HistoryInfo';
import { List, ListItem, ListItemText, Typography } from '@material-ui/core';
import { Service, services } from '@services';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

export const HomePage: React.FC = () => {
	const history = useHistory();
	const [currentServices, setServices] = useState([] as Service[]);

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	useEffect(() => {
		const checkEnabledServices = () => {
			const serviceOptions = BrowserStorage.options.services;
			const enabledServices = Object.values(services).filter(
				(service) => service.hasSync && serviceOptions[service.id].sync
			);
			setServices(enabledServices);
		};

		checkEnabledServices();
	}, []);

	return (
		<HistoryInfo>
			{currentServices.length > 0 ? (
				<>
					<Typography variant="h6">{I18N.translate('selectService')}</Typography>
					<List>
						{currentServices.map((service) => (
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
				<Typography variant="body1">{I18N.translate('noServices')}</Typography>
			)}
		</HistoryInfo>
	);
};
