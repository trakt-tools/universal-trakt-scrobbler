import {
	Button,
	ButtonGroup,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	MenuItem,
	Select,
	Switch,
} from '@material-ui/core';
import * as React from 'react';
import {
	BrowserStorage,
	Option,
	StorageValuesOptions,
	StreamingServiceValue,
} from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { StreamingServiceOptions } from './StreamingServiceOptions';

interface OptionsListItemProps {
	option: Option<keyof StorageValuesOptions>;
}

export const OptionsListItem: React.FC<OptionsListItemProps> = (props: OptionsListItemProps) => {
	const { option } = props;

	const onSwitchChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		await EventDispatcher.dispatch('OPTIONS_CHANGE', option.id, {
			id: option.id,
			value: event.target.checked,
		});
	};

	const onSelectChange = async (event: React.ChangeEvent<{ value: unknown }>) => {
		await EventDispatcher.dispatch('OPTIONS_CHANGE', option.id, {
			id: option.id,
			value: event.target.value as StorageValuesOptions[keyof StorageValuesOptions],
		});
	};

	const onSelectAllClick = async () => {
		if (!BrowserStorage.isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			'STREAMING_SERVICE_OPTIONS_CHANGE',
			null,
			Object.keys(option.value).map((id) => ({
				id,
				value: { scrobble: true, sync: true },
			}))
		);
	};

	const onSelectNoneClick = async () => {
		if (!BrowserStorage.isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			'STREAMING_SERVICE_OPTIONS_CHANGE',
			null,
			Object.keys(option.value).map((id) => ({
				id,
				value: { scrobble: false, sync: false },
			}))
		);
	};

	const onToggleAllClick = async () => {
		if (!BrowserStorage.isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			'STREAMING_SERVICE_OPTIONS_CHANGE',
			null,
			Object.entries(option.value).map(([id, value]) => ({
				id,
				value: { scrobble: !value.scrobble, sync: !value.sync },
			}))
		);
	};

	let secondaryAction;
	switch (option.type) {
		case 'switch':
			secondaryAction = (
				<Switch checked={!!option.value} color="primary" edge="end" onChange={onSwitchChange} />
			);
			break;
		case 'select':
			secondaryAction = (
				<Select value={option.value} onChange={onSelectChange}>
					{Object.entries(option.selectItems).map(([key, name]) => (
						<MenuItem key={key} value={key}>
							{name}
						</MenuItem>
					))}
				</Select>
			);
			break;
		case 'list':
			secondaryAction = (
				<ButtonGroup variant="contained">
					<Button onClick={onSelectAllClick}>{I18N.translate('selectAll')}</Button>
					<Button onClick={onSelectNoneClick}>{I18N.translate('selectNone')}</Button>
					<Button onClick={onToggleAllClick}>{I18N.translate('toggleAll')}</Button>
				</ButtonGroup>
			);
			break;
	}

	return (
		<>
			<ListItem
				classes={{ root: 'options-list-item', secondaryAction: 'options-list-item--secondary' }}
			>
				<ListItemText primary={option.name} secondary={option.description} />
				<ListItemSecondaryAction>{secondaryAction}</ListItemSecondaryAction>
			</ListItem>
			{BrowserStorage.isStreamingServiceOption(option) && (
				<StreamingServiceOptions options={option.value} />
			)}
		</>
	);
};
