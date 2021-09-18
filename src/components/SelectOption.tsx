import { MenuItem, Select, SelectChangeEvent } from '@mui/material';
import React, { useEffect, useState } from 'react';

interface SelectOptionProps extends WithSx {
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
	sx = {},
}: SelectOptionProps) => {
	const [value, setValue] = useState(initialValue);

	const onChange = (event: SelectChangeEvent) => {
		const newValue = event.target.value;
		handleChange(id, newValue);
	};

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	return (
		<Select disabled={isDisabled} value={value} onChange={onChange} sx={sx}>
			{Object.entries(choices).map(([key, name]) => (
				<MenuItem key={key} value={key}>
					{name}
				</MenuItem>
			))}
		</Select>
	);
};
