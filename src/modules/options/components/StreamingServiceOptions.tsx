import { List } from '@material-ui/core';
import * as React from 'react';
import { StreamingServiceOption } from './StreamingServiceOption';
import { StreamingServiceId } from '../../../streaming-services/streaming-services';

interface StreamingServiceOptionsProps {
	options: Record<StreamingServiceId, boolean>;
}

export const StreamingServiceOptions: React.FC<StreamingServiceOptionsProps> = (
	props: StreamingServiceOptionsProps
) => {
	const { options } = props;
	return (
		<List classes={{ root: 'options--streaming-service' }}>
			{(Object.entries(options) as [StreamingServiceId, boolean][]).map(([id, value]) => (
				<StreamingServiceOption key={id} id={id} value={value} />
			))}
		</List>
	);
};
