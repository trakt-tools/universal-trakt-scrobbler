import { SwitchOption } from '@components/SwitchOption';
import PropTypes from 'prop-types';
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
}) => {
	return (
		<SwitchOption id="autoSync" value={autoSync} isDisabled={!sync} handleChange={handleChange} />
	);
};

_ServiceAutoSyncOption.propTypes = {
	sync: PropTypes.bool.isRequired,
	autoSync: PropTypes.bool.isRequired,
	handleChange: PropTypes.func.isRequired,
};

export const ServiceAutoSyncOption = React.memo(_ServiceAutoSyncOption);
