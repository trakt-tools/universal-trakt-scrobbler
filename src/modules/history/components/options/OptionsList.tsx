import { List } from '@material-ui/core';
import * as React from 'react';
import { OptionsListItem } from './OptionsListItem';
import { Option } from '../../../../services/BrowserStorage';

interface OptionsListProps {
	options: Option[];
}

const OptionsList: React.FC<OptionsListProps> = (props: OptionsListProps) => {
	const { options } = props;
	return (
		<List>
			{options.map((option) => (
				<OptionsListItem key={option.id} option={option} />
			))}
		</List>
	);
};

export { OptionsList };
