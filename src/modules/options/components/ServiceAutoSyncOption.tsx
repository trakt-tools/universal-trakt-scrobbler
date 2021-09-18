import { SwitchOption } from '@components/SwitchOption';
import React from 'react';

interface ServiceAutoSyncOptionProps {
	sync: boolean;
	autoSync: boolean;
	handleChange: (optionId: string, newValue: boolean) => void;
}

const _ServiceAutoSyncOption: React.FC<ServiceAutoSyncOptionProps> = ({
	sync,
	autoSync,
	handleChange,
}: ServiceAutoSyncOptionProps) => {
	return (
		<SwitchOption id="autoSync" value={autoSync} isDisabled={!sync} handleChange={handleChange} />
	);
};

export const ServiceAutoSyncOption = React.memo(_ServiceAutoSyncOption);
