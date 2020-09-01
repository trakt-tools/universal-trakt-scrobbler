import { FormControlLabel, Switch, TextField } from '@material-ui/core';
import * as React from 'react';
import { SyncOption } from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';

interface HistoryOptionsListItemProps {
	option: SyncOption;
}

export const HistoryOptionsListItem: React.FC<HistoryOptionsListItemProps> = ({ option }) => {
	const onSwitchChange = async (): Promise<void> => {
		await EventDispatcher.dispatch('HISTORY_OPTIONS_CHANGE', null, {
			id: option.id,
			value: !option.value,
		});
	};

	const onNumberInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
		await EventDispatcher.dispatch('HISTORY_OPTIONS_CHANGE', null, {
			id: option.id,
			value: parseInt(event.currentTarget.value),
		});
	};

	let component: React.ReactElement;
	switch (typeof option.value) {
		case 'boolean': {
			component = (
				<FormControlLabel
					control={<Switch checked={option.value} color="primary" onChange={onSwitchChange} />}
					label={option.name}
				/>
			);
			break;
		}
		case 'number': {
			component = (
				<TextField
					label={option.name}
					onChange={onNumberInputChange}
					type="number"
					value={option.value}
				/>
			);
			break;
		}
	}
	return component;
};
