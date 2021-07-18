import { I18N } from '@common/I18N';
import { AppBar, Toolbar, Typography } from '@material-ui/core';
import React from 'react';

export const OptionsHeader: React.FC = () => {
	return (
		<AppBar position="sticky">
			<Toolbar>
				<Typography variant="h6">{I18N.translate('options')}</Typography>
			</Toolbar>
		</AppBar>
	);
};
