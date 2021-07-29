import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

interface UtsCenterProps {
	children: React.ReactNode;
	className?: string;
	isHorizontal?: boolean;
}

export const UtsCenter: React.FC<UtsCenterProps> = ({
	children,
	className,
	isHorizontal = true,
}) => {
	return (
		<Box
			className={`container--center-${isHorizontal ? 'horizontal' : 'vertical'} ${className || ''}`}
		>
			{children}
		</Box>
	);
};

UtsCenter.propTypes = {
	children: PropTypes.node.isRequired,
	className: PropTypes.string,
	isHorizontal: PropTypes.bool,
};
