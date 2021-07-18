import { Box } from '@material-ui/core';
import React from 'react';

interface UtsCenterProps {
	children: React.ReactNode;
	className?: string;
	isHorizontal?: boolean;
}

export const UtsCenter: React.FC<UtsCenterProps> = (props: UtsCenterProps) => {
	const { children, className, isHorizontal = true } = props;
	return (
		<Box
			className={`container--center-${isHorizontal ? 'horizontal' : 'vertical'} ${className || ''}`}
		>
			{children}
		</Box>
	);
};
