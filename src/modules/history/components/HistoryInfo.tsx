import { UtsCenter } from '@components/UtsCenter';
import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

interface HistoryInfoProps {
	children?: React.ReactNode;
}

export const HistoryInfo: React.FC<HistoryInfoProps> = ({ children }) => {
	return (
		<UtsCenter>
			<Box className="history-info">{children}</Box>
		</UtsCenter>
	);
};

HistoryInfo.propTypes = {
	children: PropTypes.node,
};
