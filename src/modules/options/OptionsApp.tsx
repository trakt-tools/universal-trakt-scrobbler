import { Shared } from '@common/Shared';
import { CustomDialog } from '@components/CustomDialog';
import { CustomSnackbar } from '@components/CustomSnackbar';
import { OptionsActions } from '@components/OptionsActions';
import { OptionsHeader } from '@components/OptionsHeader';
import { OptionsList } from '@components/OptionsList';
import { Container } from '@mui/material';

export const OptionsApp = (): JSX.Element => {
	return (
		<>
			<OptionsHeader />
			<Container
				sx={{
					paddingTop: 2,
					paddingBottom: '100px',
				}}
			>
				<OptionsList details={Shared.storage.optionsDetails} />
				<OptionsActions />
				<CustomDialog />
				<CustomSnackbar />
			</Container>
		</>
	);
};
