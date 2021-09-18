import { FormControlLabel, Switch } from '@mui/material';
import { ChangeEvent, useEffect, useState } from 'react';

interface SwitchOptionProps extends WithSx {
	id: string;
	label?: string;
	value: boolean;
	isDisabled: boolean;
	handleChange: (id: string, newValue: boolean) => void;
}

export const SwitchOption = ({
	id,
	label,
	value: initialValue,
	isDisabled,
	handleChange,
	sx = {},
}: SwitchOptionProps): JSX.Element => {
	const [value, setValue] = useState(initialValue);

	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
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
