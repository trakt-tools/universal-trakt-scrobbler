import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

function UtsLeftRight({ centerVertically, className, left, right }) {
  return (
    <Box className={`container--left-right${centerVertically ? '--center' : ''} ${className || ''}`}>
      <Box>{left}</Box>
      <Box>{right}</Box>
    </Box>
  );
}

UtsLeftRight.propTypes = {
  centerVertically: PropTypes.bool.isRequired,
  className: PropTypes.string,
  left: PropTypes.node.isRequired,
  right: PropTypes.node.isRequired,
};

export { UtsLeftRight };