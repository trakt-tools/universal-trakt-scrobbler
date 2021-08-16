import { MenuItem, Select } from '@material-ui/core';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

interface SelectOptionProps {
	id: string;
	value: string;
	isDisabled: boolean;
	choices: Record<string, string>;
	handleChange: (id: string, newValue: string) => void;
}

export const SelectOption: React.FC<SelectOptionProps> = ({
	id,
	value: initialValue,
	isDisabled,
	choices,
	handleChange,
}) => {
	const [value, setValue] = useState(initialValue);

	const onChange = (event: React.ChangeEvent<{ value: unknown }>) => {
		const newValue = event.target.value as string;
		handleChange(id, newValue);
	};

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	return (
		<Select disabled={isDisabled} value={value} onChange={onChange}>
			{Object.entries(choices).map(([key, name]) => (
				<MenuItem key={key} value={key}>
					{name}
				</MenuItem>
			))}
		</Select>
	);
};

SelectOption.propTypes = {
	id: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
	isDisabled: PropTypes.bool.isRequired,
	choices: PropTypes.any.isRequired,
	handleChange: PropTypes.func.isRequired,
};
