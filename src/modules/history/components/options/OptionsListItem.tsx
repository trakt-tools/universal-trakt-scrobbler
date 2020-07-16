import {
	Button,
	ButtonGroup,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	Switch,
} from '@material-ui/core';
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
		await EventDispatcher.dispatch(Events.OPTIONS_CHANGE, null, {
			id: option.id,
			value: !option.value,
		});
	};

	const onSelectAllClick = async () => {
		if (!isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			Events.STREAMING_SERVICE_OPTIONS_CHANGE,
			null,
			Object.keys(option.value).map((id) => ({ id, value: true }))
		);
	};

	const onSelectNoneClick = async () => {
		if (!isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			Events.STREAMING_SERVICE_OPTIONS_CHANGE,
			null,
			Object.keys(option.value).map((id) => ({ id, value: false }))
		);
	};

	const onToggleAllClick = async () => {
		if (!isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			Events.STREAMING_SERVICE_OPTIONS_CHANGE,
			null,
			Object.entries(option.value).map(([id, value]) => ({ id, value: !value }))
		);
	};

	const isStreamingServiceOption = (
		option: Option<keyof StorageValuesOptions>
	): option is Option<'streamingServices'> => {
		return option.id === 'streamingServices';
	};

	return (
		<>
			<ListItem
				classes={{ root: 'options-list-item', secondaryAction: 'options-list-item--secondary' }}
			>
				<ListItemText primary={option.name} secondary={option.description} />
				{isStreamingServiceOption(option) ? (
					<ListItemSecondaryAction>
						<ButtonGroup variant="contained">
							<Button onClick={onSelectAllClick}>{browser.i18n.getMessage('selectAll')}</Button>
							<Button onClick={onSelectNoneClick}>{browser.i18n.getMessage('selectNone')}</Button>
							<Button onClick={onToggleAllClick}>{browser.i18n.getMessage('toggleAll')}</Button>
						</ButtonGroup>
					</ListItemSecondaryAction>
				) : (
					<ListItemSecondaryAction>
						<Switch checked={!!option.value} color="primary" edge="end" onChange={onChange} />
					</ListItemSecondaryAction>
				)}
			</ListItem>
			{isStreamingServiceOption(option) && <StreamingServiceOptions options={option.value} />}
		</>
	);
};
