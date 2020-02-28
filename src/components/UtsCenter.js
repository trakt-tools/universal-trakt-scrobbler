import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

function UtsCenter({ children, className }) {
  return (
    <Box className={`container--center ${className || ''}`}>
      {children}
    </Box>
  );
}

UtsCenter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export { UtsCenter };