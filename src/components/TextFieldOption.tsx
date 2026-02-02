import { TextField } from '@mui/material';
import { ChangeEvent, useEffect, useState } from 'react';

interface BaseTextFieldOptionProps<T extends string | number> extends WithSx {
	id: string;
	label: string;
	value: T;
	isDisabled: boolean;
	isFloat?: boolean;
	minValue?: number;
	maxValue?: number;
	step?: number;
	handleChange: (id: string, newValue: T) => void;
}

const BaseTextFieldOption = <T extends string | number>({
	id,
	label,
	value: initialValue,
	isDisabled,
	isFloat,
	minValue = 0,
	maxValue,
	step = 1,
	handleChange,
	sx = {},
}: BaseTextFieldOptionProps<T>): JSX.Element => {
	const [value, setValue] = useState<T | null>(initialValue);

	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		const targetValue = event.target.value;
		let newValue;
		if (typeof value === 'string') {
			newValue = targetValue;
			if (!newValue) {
				setValue(null);
				return;
			}
		} else {
			if (isFloat) {
				newValue = parseFloat(targetValue);
			} else {
				newValue = parseInt(targetValue);
			}
			if (isNaN(newValue)) {
				setValue(null);
				return;
			}
			newValue = Math.max(newValue, minValue);
			if (typeof maxValue !== 'undefined') {
				newValue = Math.min(newValue, maxValue);
			}
		}
		handleChange(id, newValue as T);
	};

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	return (
		<TextField
			disabled={isDisabled}
			label={label}
			margin="normal"
			size="small"
			type={typeof value}
			value={value !== null ? value : ''}
			variant="outlined"
			inputProps={
				typeof value === 'number'
					? {
							max: maxValue,
							min: minValue,
							step,
						}
					: {}
			}
			onChange={onChange}
			sx={sx}
		/>
	);
};

export const TextFieldOption = (props: BaseTextFieldOptionProps<string>) => {
	return BaseTextFieldOption(props);
};

export const NumericTextFieldOption = (props: BaseTextFieldOptionProps<number>) => {
	return BaseTextFieldOption(props);
};
