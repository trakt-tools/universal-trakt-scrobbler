import { FormControlLabel, Switch } from '@material-ui/core';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

interface SwitchOptionProps {
	id: string;
	label?: string;
	value: boolean;
	isDisabled: boolean;
	handleChange: (id: string, newValue: boolean) => void;
}

export const SwitchOption: React.FC<SwitchOptionProps> = ({
	id,
	label,
	value: initialValue,
	isDisabled,
	handleChange,
}) => {
	const [value, setValue] = useState(initialValue);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.checked;
		handleChange(id, newValue);
	};

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	const switchComponent = (
		<Switch checked={value} color="primary" disabled={isDisabled} onChange={onChange} />
	);

	return label ? <FormControlLabel control={switchComponent} label={label} /> : switchComponent;
};

SwitchOption.propTypes = {
	id: PropTypes.string.isRequired,
	label: PropTypes.string,
	value: PropTypes.bool.isRequired,
	isDisabled: PropTypes.bool.isRequired,
	handleChange: PropTypes.func.isRequired,
};
