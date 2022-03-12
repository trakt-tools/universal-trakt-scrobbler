import { StorageOptionsChangeData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { HistoryInfo } from '@components/HistoryInfo';
import { useHistory } from '@contexts/HistoryContext';
import { getServices, Service } from '@models/Service';
import { List, ListItem, ListItemText, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export const HomePage = (): JSX.Element => {
	const history = useHistory();
	const [services, setServices] = useState([] as Service[]);

	const onRouteClick = (path: string) => {
		history.push(path);
	};

	useEffect(() => {
		const startListeners = () => {
			Shared.events.subscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const stopListeners = () => {
			Shared.events.unsubscribe('STORAGE_OPTIONS_CHANGE', null, onStorageOptionsChange);
		};

		const onStorageOptionsChange = (data: StorageOptionsChangeData) => {
			if (data.options?.services) {
				checkEnabledServices();
			}
		};

		const checkEnabledServices = () => {
			const serviceOptions = Shared.storage.options.services;
			const enabledServices = getServices().filter(
				(service) => service.hasSync && serviceOptions[service.id].sync
			);
			setServices(enabledServices);
		};

		startListeners();
		checkEnabledServices();
		return stopListeners;
	}, []);

	return (
		<HistoryInfo>
			{services.length > 0 ? (
				<>
					<Typography variant="h6">{I18N.translate('selectService')}</Typography>
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
				<Typography variant="body1">{I18N.translate('noServices')}</Typography>
			)}
		</HistoryInfo>
	);
};
