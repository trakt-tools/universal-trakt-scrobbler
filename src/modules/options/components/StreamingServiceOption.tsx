import { Grid, Switch, Typography } from '@material-ui/core';
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
		]);
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
		</Grid>
	);
};
