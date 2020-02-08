import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { UtsCenter } from '../../../components/UtsCenter';

function HistoryInfo({ children }) {
  return (
    <UtsCenter>
      <Box className="history-info">
        {children}
      </Box>
    </UtsCenter>
  );
}

HistoryInfo.propTypes = {
  children: PropTypes.node.isRequired,
};

export { HistoryInfo };