import { BrowserStorage } from '@common/BrowserStorage';
import { OptionsListItem } from '@components/OptionsListItem';
import { List } from '@material-ui/core';
import React from 'react';

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
