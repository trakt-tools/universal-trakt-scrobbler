import { ListItem, ListItemSecondaryAction, ListItemText, Switch } from '@material-ui/core';
import * as React from 'react';
import { Option } from '../../../../services/BrowserStorage';
import { EventDispatcher, Events } from '../../../../services/Events';

interface OptionsListItemProps {
	option: Option;
}

export const OptionsListItem: React.FC<OptionsListItemProps> = (props: OptionsListItemProps) => {
	const { option } = props;

	const onChange = async () => {
		await EventDispatcher.dispatch(Events.OPTIONS_CHANGE, {
			id: option.id,
			checked: !option.value,
		});
	};

	return (
		<ListItem classes={{ secondaryAction: 'options-list-item' }}>
			<ListItemText primary={option.name} secondary={option.description} />
			<ListItemSecondaryAction>
				<Switch checked={option.value} color="primary" edge="end" onChange={onChange} />
			</ListItemSecondaryAction>
		</ListItem>
	);
};
