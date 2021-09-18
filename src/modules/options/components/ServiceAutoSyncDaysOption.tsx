import { I18N } from '@common/I18N';
import { NumericTextFieldOption } from '@components/TextFieldOption';
import { Box, Tooltip } from '@mui/material';
import { memo } from 'react';

interface ServiceAutoSyncDaysOptionProps {
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	handleChange: (optionId: string, newValue: number) => void;
}

const _ServiceAutoSyncDaysOption = ({
	sync,
	autoSync,
	autoSyncDays,
	handleChange,
}: ServiceAutoSyncDaysOptionProps): JSX.Element => {
	return (
		<Tooltip title={I18N.translate('daysDescription')}>
			<Box component="span">
				<NumericTextFieldOption
					id="autoSyncDays"
					label={I18N.translate('days')}
					value={autoSyncDays}
					isDisabled={!sync || !autoSync}
					minValue={1}
					handleChange={handleChange}
					sx={{
						width: 100,
					}}
				/>
			</Box>
		</Tooltip>
	);
};

export const ServiceAutoSyncDaysOption = memo(_ServiceAutoSyncDaysOption);
