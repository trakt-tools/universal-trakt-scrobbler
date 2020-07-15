import { Box } from '@material-ui/core';
import * as React from 'react';

interface UtsCenterProps {
	children: React.ReactNode;
	className?: string;
}

export const UtsCenter: React.FC<UtsCenterProps> = (props: UtsCenterProps) => {
	const { children, className } = props;
	return <Box className={`container--center ${className || ''}`}>{children}</Box>;
};
