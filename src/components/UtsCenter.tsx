import { Box } from '@material-ui/core';
import * as React from 'react';

interface UtsCenterProps {
  className?: string;
}

const UtsCenter: React.FC<UtsCenterProps> = ({ children, className }) => (
  <Box className={`container--center ${className || ''}`}>
    {children}
  </Box>
);

export { UtsCenter };