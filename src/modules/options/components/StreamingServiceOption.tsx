import { ListItem, ListItemSecondaryAction, ListItemText, Switch } from '@material-ui/core';
import * as React from 'react';
import { EventDispatcher } from '../../../services/Events';
import {
	StreamingServiceId,
	streamingServices,
} from '../../../streaming-services/streaming-services';

interface StreamingServiceOptionProps {
	id: StreamingServiceId;
	value: boolean;
}

export const StreamingServiceOption: React.FC<StreamingServiceOptionProps> = (
	props: StreamingServiceOptionProps
) => {
	const { id, value } = props;

	const service = streamingServices[id];

	const onChange = async () => {
		await EventDispatcher.dispatch('STREAMING_SERVICE_OPTIONS_CHANGE', null, [
			{ id, value: !value },
		]);
	};

	return (
		<ListItem classes={{ secondaryAction: 'options-list-item' }}>
			<ListItemText primary={service.name} />
			<ListItemSecondaryAction>
				<Switch checked={value} color="primary" edge="end" onChange={onChange} />
			</ListItemSecondaryAction>
		</ListItem>
	);
};
