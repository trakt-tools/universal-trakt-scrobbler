import { BrowserStorage } from '@common/BrowserStorage';
import { OptionsActions } from '@components/OptionsActions';
import { OptionsHeader } from '@components/OptionsHeader';
import { OptionsList } from '@components/OptionsList';
import { UtsDialog } from '@components/UtsDialog';
import { UtsSnackbar } from '@components/UtsSnackbar';
import { Container } from '@material-ui/core';
import React from 'react';

export const OptionsApp: React.FC = () => {
	return (
		<>
			<OptionsHeader />
			<Container className="options-container">
				<OptionsList details={BrowserStorage.optionsDetails} />
				<OptionsActions />
				<UtsDialog />
				<UtsSnackbar />
			</Container>
		</>
	);
};
