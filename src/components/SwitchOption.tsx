import { FormControlLabel, Switch } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

interface SwitchOptionProps extends WithSx {
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
	sx = {},
}: SwitchOptionProps) => {
	const [value, setValue] = useState(initialValue);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.checked;
		handleChange(id, newValue);
	};

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	const switchComponent = (
		<Switch checked={value} disabled={isDisabled} onChange={onChange} sx={sx} />
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
