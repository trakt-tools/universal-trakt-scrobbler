import { BrowserStorage } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { HistoryInfo } from '@components/HistoryInfo';
import { useHistory } from '@contexts/HistoryContext';
import { List, ListItem, ListItemText, Typography } from '@material-ui/core';
import { getServices, Service } from '@models/Service';
import React, { useEffect, useState } from 'react';

export const HomePage: React.FC = () => {
	const history = useHistory();
	const [currentServices, setServices] = useState([] as Service[]);

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	useEffect(() => {
		const checkEnabledServices = () => {
			const serviceOptions = BrowserStorage.options.services;
			const enabledServices = getServices().filter(
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
								onClick={() => onRouteClick(service.path)}
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
