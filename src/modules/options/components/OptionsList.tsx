import { List } from '@material-ui/core';
import * as React from 'react';
import { Option, StorageValuesOptions } from '../../../common/BrowserStorage';
import { OptionsListItem } from './OptionsListItem';

interface OptionsListProps {
	options: Option<keyof StorageValuesOptions>[];
}

export const OptionsList: React.FC<OptionsListProps> = (props: OptionsListProps) => {
	const { options } = props;
	return (
		<List>
			{options
				.filter((option) => option.doShow)
				.map((option) => (
					<OptionsListItem key={option.id} option={option} />
				))}
		</List>
	);
};
