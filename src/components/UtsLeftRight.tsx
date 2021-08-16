import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

interface UtsLeftRightProps {
	centerVertically: boolean;
	className?: string;
	left: React.ReactNode;
	middle?: React.ReactNode;
	right: React.ReactNode;
}

export const UtsLeftRight: React.FC<UtsLeftRightProps> = ({
	centerVertically,
	className,
	left,
	middle,
	right,
}) => {
	return (
		<Box
			className={`container--left-right${centerVertically ? '--center' : ''} ${className || ''}`}
		>
			<Box>{left}</Box>
			{middle && <Box>{middle}</Box>}
			<Box>{right}</Box>
		</Box>
	);
};

UtsLeftRight.propTypes = {
	centerVertically: PropTypes.bool.isRequired,
	className: PropTypes.string,
	left: PropTypes.node.isRequired,
	middle: PropTypes.node,
	right: PropTypes.node.isRequired,
};
