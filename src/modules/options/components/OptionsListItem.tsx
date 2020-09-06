import {
	Button,
	ButtonGroup,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	Switch,
} from '@material-ui/core';
import * as React from 'react';
import { Option, StorageValuesOptions } from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';
import { I18N } from '../../../common/I18N';
import { StreamingServiceId } from '../../../streaming-services/streaming-services';
import { StreamingServiceOptions } from './StreamingServiceOptions';

interface OptionsListItemProps {
	option: Option<keyof StorageValuesOptions>;
}

export const OptionsListItem: React.FC<OptionsListItemProps> = (props: OptionsListItemProps) => {
	const { option } = props;

	const onChange = async () => {
		await EventDispatcher.dispatch('OPTIONS_CHANGE', null, {
			id: option.id,
			value: !option.value,
		});
	};

	const onSelectAllClick = async () => {
		if (!isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			'STREAMING_SERVICE_OPTIONS_CHANGE',
			null,
			(Object.keys(option.value) as StreamingServiceId[]).map((id) => ({ id, value: true }))
		);
	};

	const onSelectNoneClick = async () => {
		if (!isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			'STREAMING_SERVICE_OPTIONS_CHANGE',
			null,
			(Object.keys(option.value) as StreamingServiceId[]).map((id) => ({ id, value: false }))
		);
	};

	const onToggleAllClick = async () => {
		if (!isStreamingServiceOption(option)) {
			return;
		}
		await EventDispatcher.dispatch(
			'STREAMING_SERVICE_OPTIONS_CHANGE',
			null,
			(Object.entries(option.value) as [StreamingServiceId, boolean][]).map(([id, value]) => ({
				id,
				value: !value,
			}))
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
							<Button onClick={onSelectAllClick}>{I18N.translate('selectAll')}</Button>
							<Button onClick={onSelectNoneClick}>{I18N.translate('selectNone')}</Button>
							<Button onClick={onToggleAllClick}>{I18N.translate('toggleAll')}</Button>
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
