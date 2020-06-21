import { ListItem, ListItemSecondaryAction, ListItemText, Switch } from '@material-ui/core';
import * as React from 'react';
import { Events, EventDispatcher } from '../../../../services/Events';

interface OptionsListItemProps {
	option: Option;
}

const OptionsListItem: React.FC<OptionsListItemProps> = (props: OptionsListItemProps) => {
	const { option } = props;

	async function onChange() {
		await EventDispatcher.dispatch(Events.OPTIONS_CHANGE, {
			id: option.id,
			checked: !option.value,
		});
	}

	return (
		<ListItem classes={{ secondaryAction: 'options-list-item' }}>
			<ListItemText primary={option.name} secondary={option.description} />
			<ListItemSecondaryAction>
				<Switch checked={option.value} color="primary" edge="end" onChange={onChange} />
			</ListItemSecondaryAction>
		</ListItem>
	);
};

export { OptionsListItem };
