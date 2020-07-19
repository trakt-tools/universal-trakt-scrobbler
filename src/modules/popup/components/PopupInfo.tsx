import { Box } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { UtsCenter } from '../../../components/UtsCenter';

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
