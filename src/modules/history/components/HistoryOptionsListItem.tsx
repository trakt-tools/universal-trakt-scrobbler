import { FormControlLabel, Switch, TextField } from '@material-ui/core';
import * as React from 'react';
import { StorageValuesSyncOptions, SyncOption } from '../../../common/BrowserStorage';
import { EventDispatcher } from '../../../common/Events';

interface HistoryOptionsListItemProps {
	option: SyncOption<keyof StorageValuesSyncOptions>;
}

export const HistoryOptionsListItem: React.FC<HistoryOptionsListItemProps> = ({ option }) => {
	const onSwitchChange = async (): Promise<void> => {
		await EventDispatcher.dispatch('HISTORY_OPTIONS_CHANGE', null, {
			id: option.id,
			value: !option.value,
		});
	};

	const onNumberInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
		let value = parseInt(event.currentTarget.value || '0');
		if (typeof option.minValue !== 'undefined') {
			value = Math.max(value, option.minValue);
		}
		if (typeof option.maxValue !== 'undefined') {
			value = Math.min(value, option.maxValue);
		}

		await EventDispatcher.dispatch('HISTORY_OPTIONS_CHANGE', null, {
			id: option.id,
			value,
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
					inputProps={{
						min: typeof option.minValue !== 'undefined' ? option.minValue : undefined,
						max: typeof option.maxValue !== 'undefined' ? option.maxValue : undefined,
					}}
					value={option.value}
				/>
			);
			break;
		}
	}
	return component;
};
