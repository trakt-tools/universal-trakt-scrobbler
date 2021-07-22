import { TextField } from '@material-ui/core';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

interface BaseTextFieldOptionProps<T extends string | number> {
	id: string;
	label: string;
	value: T;
	isDisabled: boolean;
	isFloat?: boolean;
	minValue?: number;
	maxValue?: number;
	step?: number;
	style?: React.CSSProperties;
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
	style,
	handleChange,
}: BaseTextFieldOptionProps<T>): React.ReactElement => {
	const [value, setValue] = useState<T | null>(initialValue);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
			style={style}
			onChange={onChange}
		/>
	);
};

BaseTextFieldOption.propTypes = {
	id: PropTypes.string.isRequired,
	label: PropTypes.string.isRequired,
	value: PropTypes.oneOf([PropTypes.string, PropTypes.number]).isRequired,
	isDisabled: PropTypes.bool.isRequired,
	isFloat: PropTypes.bool,
	maxValue: PropTypes.number,
	minValue: PropTypes.number,
	step: PropTypes.number,
	width: PropTypes.number,
	handleChange: PropTypes.func.isRequired,
};

export const TextFieldOption: React.FC<BaseTextFieldOptionProps<string>> = (props) => {
	return BaseTextFieldOption(props);
};

export const NumericTextFieldOption: React.FC<BaseTextFieldOptionProps<number>> = (props) => {
	return BaseTextFieldOption(props);
};
