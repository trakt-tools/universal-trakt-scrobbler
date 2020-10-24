import { AppBar, Toolbar, Typography } from '@material-ui/core';
import * as React from 'react';
import { I18N } from '../../../common/I18N';

export const OptionsHeader: React.FC = () => {
	return (
		<AppBar position="sticky">
			<Toolbar>
				<Typography variant="h6">{I18N.translate('options')}</Typography>
			</Toolbar>
		</AppBar>
	);
};
