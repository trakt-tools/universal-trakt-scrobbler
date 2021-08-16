import { UtsCenter } from '@components/UtsCenter';
import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

export const PopupInfo: React.FC = ({ children }) => {
	return (
		<UtsCenter>
			<Box className="popup-info">{children}</Box>
		</UtsCenter>
	);
};

PopupInfo.propTypes = {
	children: PropTypes.node.isRequired,
};
