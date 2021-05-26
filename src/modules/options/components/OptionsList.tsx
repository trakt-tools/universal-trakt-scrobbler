import { List } from '@material-ui/core';
import * as React from 'react';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { OptionsListItem } from './OptionsListItem';

export const OptionsList: React.FC = () => {
	return (
		<List>
			{Object.values(BrowserStorage.optionsDetails)
				.filter((option) => option.doShow)
				.map((option) => (
					<OptionsListItem key={option.id} option={option} />
				))}
		</List>
	);
};
