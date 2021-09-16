import { BrowserStorage } from '@common/BrowserStorage';
import { CustomDialog } from '@components/CustomDialog';
import { CustomSnackbar } from '@components/CustomSnackbar';
import { OptionsActions } from '@components/OptionsActions';
import { OptionsHeader } from '@components/OptionsHeader';
import { OptionsList } from '@components/OptionsList';
import { Container } from '@mui/material';
import React from 'react';

export const OptionsApp: React.FC = () => {
	return (
		<>
			<OptionsHeader />
			<Container
				sx={{
					paddingTop: 2,
					paddingBottom: '100px',
				}}
			>
				<OptionsList details={BrowserStorage.optionsDetails} />
				<OptionsActions />
				<CustomDialog />
				<CustomSnackbar />
			</Container>
		</>
	);
};
