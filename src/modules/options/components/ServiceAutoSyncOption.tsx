import { SwitchOption } from '@components/SwitchOption';
import { memo } from 'react';

interface ServiceAutoSyncOptionProps {
	sync: boolean;
	autoSync: boolean;
	handleChange: (optionId: string, newValue: boolean) => void;
}

const _ServiceAutoSyncOption = ({
	sync,
	autoSync,
	handleChange,
}: ServiceAutoSyncOptionProps): JSX.Element => {
	return (
		<SwitchOption id="autoSync" value={autoSync} isDisabled={!sync} handleChange={handleChange} />
	);
};

export const ServiceAutoSyncOption = memo(_ServiceAutoSyncOption);
