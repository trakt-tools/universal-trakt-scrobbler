import { Box } from '@material-ui/core';
import * as React from 'react';

interface UtsLeftRightProps {
	centerVertically: boolean;
	className?: string;
	left: React.ReactElement;
	right?: React.ReactElement;
}

export const UtsLeftRight: React.FC<UtsLeftRightProps> = (props: UtsLeftRightProps) => {
	const { centerVertically, className, left, right } = props;
	return (
		<Box
			className={`container--left-right${centerVertically ? '--center' : ''} ${className || ''}`}
		>
			<Box>{left}</Box>
			<Box>{right}</Box>
		</Box>
	);
};
