import { List } from '@material-ui/core';
import * as React from 'react';
import { Option } from '../../../../services/BrowserStorage';
import { OptionsListItem } from './OptionsListItem';

interface OptionsListProps {
	options: Option[];
}

export const OptionsList: React.FC<OptionsListProps> = (props: OptionsListProps) => {
	const { options } = props;
	return (
		<List>
			{options.map((option) => (
				<OptionsListItem key={option.id} option={option} />
			))}
		</List>
	);
};
