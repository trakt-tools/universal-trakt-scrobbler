import { Box } from '@material-ui/core';
import * as React from 'react';
import { UtsCenter } from '../../../components/UtsCenter';

const HistoryInfo: React.FC = ({ children }) => (
  <UtsCenter>
    <Box className="history-info">
      {children}
    </Box>
  </UtsCenter>
);

export { HistoryInfo };