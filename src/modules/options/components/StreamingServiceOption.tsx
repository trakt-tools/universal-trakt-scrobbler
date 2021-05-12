import { Grid, IconButton, Switch, TextField, Tooltip, Typography } from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import * as React from 'react';
import { StreamingServiceValue } from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import {
	StreamingServiceId,
	streamingServices,
} from '../../../streaming-services/streaming-services';

interface StreamingServiceOptionProps {
	id: StreamingServiceId;
	value: StreamingServiceValue;
}

export const StreamingServiceOption: React.FC<StreamingServiceOptionProps> = (
	props: StreamingServiceOptionProps
) => {
	const { id, value } = props;

	const [autoSyncDays, setAutoSyncDays] = React.useState(value.autoSyncDays);

	const service = streamingServices[id];

	const onScrobbleChange = async () => {
		await EventDispatcher.dispatch('STREAMING_SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { scrobble: !value.scrobble },
			},
		]);
	};

	const onSyncChange = async () => {
		await EventDispatcher.dispatch('STREAMING_SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { sync: !value.sync },
			},
		]);
	};

	const onAutoSyncChange = async () => {
		await EventDispatcher.dispatch('STREAMING_SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { autoSync: !value.autoSync },
			},
		]);
	};

	const onAutoSyncDaysChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const autoSyncDays = parseInt(event.target.value);
		setAutoSyncDays(autoSyncDays);
		await EventDispatcher.dispatch('STREAMING_SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { autoSyncDays },
			},
		]);
	};

	const onClearLastSyncClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearLastSyncTitle', service.name),
			message: I18N.translate('confirmClearLastSyncMessage'),
			onConfirm: async () => {
				await EventDispatcher.dispatch('STREAMING_SERVICE_OPTIONS_CHANGE', null, [
					{
						id,
						value: { lastSync: 0, lastSyncId: '' },
					},
				]);
			},
		});
	};

	return (
		<Grid container className="options-grid-container">
			<Grid item className="options-grid-item" xs={4}>
				<Typography>{service.name}</Typography>
			</Grid>
			<Grid item className="options-grid-item options-grid-item--centered" xs={1}>
				<Switch
					checked={value.scrobble}
					color="primary"
					disabled={!service.hasScrobbler}
					onChange={onScrobbleChange}
				/>
			</Grid>
			<Grid item className="options-grid-item options-grid-item--centered" xs={1}>
				<Switch
					checked={value.sync}
					color="primary"
					disabled={!service.hasSync}
					onChange={onSyncChange}
				/>
			</Grid>
			<Grid item className="options-grid-item options-grid-item--centered" xs={2}>
				<Switch
					checked={value.autoSync}
					color="primary"
					disabled={!service.hasSync || !service.hasAutoSync || !value.sync}
					edge="start"
					onChange={onAutoSyncChange}
				/>
				<TextField
					className="options-grid-item--text-field"
					disabled={!service.hasSync || !service.hasAutoSync || !value.sync || !value.autoSync}
					label={I18N.translate('days')}
					size="small"
					type="number"
					value={autoSyncDays}
					variant="outlined"
					onChange={onAutoSyncDaysChange}
				/>
				<Tooltip title={I18N.translate('clearLastSync')}>
					<IconButton
						color="secondary"
						disabled={
							!service.hasSync ||
							!service.hasAutoSync ||
							!value.sync ||
							!value.autoSync ||
							value.lastSync === 0
						}
						size="small"
						onClick={onClearLastSyncClick}
					>
						<ClearIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			</Grid>
		</Grid>
	);
};
