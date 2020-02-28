import { Box, Button, Divider } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';

function HistoryActions({ onNextPageClick, onSyncClick }) {
  return (
    <Box className="history-actions--container">
      <Divider/>
      <Box className="history-actions">
        <Button
          onClick={onNextPageClick}
          variant="contained"
        >
          {browser.i18n.getMessage('nextPage')}
        </Button>
        <Button
          color="primary"
          onClick={onSyncClick}
          variant="contained"
        >
          {browser.i18n.getMessage('sync')}
        </Button>
      </Box>
    </Box>
  );
}

HistoryActions.propTypes = {
  onNextPageClick: PropTypes.func.isRequired,
  onSyncClick: PropTypes.func.isRequired,
};

export { HistoryActions };