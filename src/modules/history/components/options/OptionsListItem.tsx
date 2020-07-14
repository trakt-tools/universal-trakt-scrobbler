import { ListItem, ListItemSecondaryAction, ListItemText, Switch } from '@material-ui/core';
import * as React from 'react';
import { Option, StorageValuesOptions } from '../../../../services/BrowserStorage';
import { EventDispatcher, Events } from '../../../../services/Events';
import { StreamingServiceOptions } from './StreamingServiceOptions';

interface OptionsListItemProps {
	option: Option<keyof StorageValuesOptions>;
}

export const OptionsListItem: React.FC<OptionsListItemProps> = (props: OptionsListItemProps) => {
	const { option } = props;

	const onChange = async () => {
		await EventDispatcher.dispatch(Events.OPTIONS_CHANGE, {
			id: option.id,
			value: !option.value,
		});
	};

	const isStreamingServiceOption = (
		option: Option<keyof StorageValuesOptions>
	): option is Option<'streamingServices'> => {
		return option.id === 'streamingServices';
	};

	return (
		<ListItem
			classes={{
				root: `options-option${
					isStreamingServiceOption(option) ? ' options-option--streaming-service' : ''
				}`,
				secondaryAction: 'options-list-item',
			}}
		>
			<ListItemText primary={option.name} secondary={option.description} />
			{isStreamingServiceOption(option) ? (
				<StreamingServiceOptions options={option.value} />
			) : (
				<ListItemSecondaryAction>
					<Switch checked={!!option.value} color="primary" edge="end" onChange={onChange} />
				</ListItemSecondaryAction>
			)}
		</ListItem>
	);
};
