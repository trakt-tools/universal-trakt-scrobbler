import { I18N } from '@common/I18N';
import { NumericTextFieldOption } from '@components/TextFieldOption';
import { Box, Tooltip } from '@mui/material';
import React from 'react';

interface ServiceAutoSyncDaysOptionProps {
	sync: boolean;
	autoSync: boolean;
	autoSyncDays: number;
	handleChange: (optionId: string, newValue: number) => void;
}

const _ServiceAutoSyncDaysOption: React.FC<ServiceAutoSyncDaysOptionProps> = ({
	sync,
	autoSync,
	autoSyncDays,
	handleChange,
}: ServiceAutoSyncDaysOptionProps) => {
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

export const ServiceAutoSyncDaysOption = React.memo(_ServiceAutoSyncDaysOption);
