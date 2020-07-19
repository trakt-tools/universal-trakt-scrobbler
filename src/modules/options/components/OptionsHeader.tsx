import { AppBar, Toolbar, Typography } from '@material-ui/core';
import * as React from 'react';

export const OptionsHeader: React.FC = () => {
	return (
		<AppBar position="sticky">
			<Toolbar>
				<Typography variant="h6">{browser.i18n.getMessage('options')}</Typography>
			</Toolbar>
		</AppBar>
	);
};
