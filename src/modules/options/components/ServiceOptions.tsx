import { CustomOptionDetails, StorageValuesOptions } from '@common/BrowserStorage';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { CenteredGrid } from '@components/CenteredGrid';
import { ServiceOption } from '@components/ServiceOption';
import {
	Button,
	ButtonGroup,
	Grid,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	Typography,
} from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

interface ServiceOptionsProps {
	option: CustomOptionDetails<StorageValuesOptions, 'services'>;
}

export const ServiceOptions: React.FC<ServiceOptionsProps> = ({ option }) => {
	const onSelectAllClick = async () => {
		await EventDispatcher.dispatch('OPTIONS_CHANGE', null, {
			services: Object.fromEntries(
				Object.keys(option.value).map((id) => [
					id,
					{
						scrobble: true,
						sync: true,
					},
				])
			),
		});
	};

	const onSelectNoneClick = async () => {
		await EventDispatcher.dispatch('OPTIONS_CHANGE', null, {
			services: Object.fromEntries(
				Object.keys(option.value).map((id) => [
					id,
					{
						scrobble: false,
						sync: false,
					},
				])
			),
		});
	};

	return (
		<>
			<ListItem
				classes={{ root: 'options-list-item', secondaryAction: 'options-list-item--secondary' }}
			>
				<ListItemText
					primary={I18N.translate(option.id)}
					secondary={I18N.translate(`${option.id}Description`)}
				/>
				<ListItemSecondaryAction>
					<ButtonGroup variant="contained">
						<Button onClick={onSelectAllClick}>{I18N.translate('selectAll')}</Button>
						<Button onClick={onSelectNoneClick}>{I18N.translate('selectNone')}</Button>
					</ButtonGroup>
				</ListItemSecondaryAction>
			</ListItem>
			<ListItem>
				<Grid container spacing={2}>
					<Grid
						item
						xs={12}
						sx={{
							overflow: 'hidden',
						}}
					>
						<CenteredGrid container spacing={10}>
							<Grid item xs={3}>
								<Typography variant="caption">{I18N.translate('service')}</Typography>
							</Grid>
							<CenteredGrid item xs={1}>
								<Typography variant="caption">{I18N.translate('serviceScrobble')}</Typography>
							</CenteredGrid>
							<CenteredGrid item xs={1}>
								<Typography variant="caption">{I18N.translate('serviceSync')}</Typography>
							</CenteredGrid>
							<CenteredGrid item xs={2}>
								<Typography variant="caption">{I18N.translate('autoSync')}</Typography>
							</CenteredGrid>
						</CenteredGrid>
					</Grid>
					{Object.entries(option.value)
						.sort(([idA], [idB]) => idA.localeCompare(idB))
						.map(([id, value]) => (
							<ServiceOption key={id} serviceId={id} initialValue={value} />
						))}
				</Grid>
			</ListItem>
		</>
	);
};

ServiceOptions.propTypes = {
	option: PropTypes.any.isRequired,
};
