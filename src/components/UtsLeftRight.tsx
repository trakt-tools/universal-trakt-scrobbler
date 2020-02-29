import { Box } from '@material-ui/core';
import * as React from 'react';

interface UtsLeftRightProps {
  centerVertically: boolean;
  className?: string,
  left: React.ReactElement,
  right: React.ReactElement,
}

const UtsLeftRight: React.FC<UtsLeftRightProps> = ({ centerVertically, className, left, right }) => (
  <Box className={`container--left-right${centerVertically ? '--center' : ''} ${className || ''}`}>
    <Box>{left}</Box>
    <Box>{right}</Box>
  </Box>
);

export { UtsLeftRight };