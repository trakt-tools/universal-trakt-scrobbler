import { Box, Button, Checkbox } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import PropTypes from 'prop-types';
import React from 'react';
import { Events } from '../../../../services/Events';
import { HistoryListItemCard } from './HistoryListItemCard';

function HistoryListItem({ dateFormat, item, serviceName }) {
  async function onCheckboxChange() {
    await Events.dispatch(Events.STREAMING_SERVICE_HISTORY_CHANGE, {
      index: item.index,
      checked: !item.isSelected,
    });
  }

  function onButtonClick() {
    // TODO: Implement option to correct item.
  }

  return (
    <Box className="history-list-item">
      {item.trakt && !item.trakt.notFound && !item.trakt.watchedAt && (
        <Checkbox
          checked={item.isSelected || false}
          className="history-list-item-checkbox"
          edge="start"
          onChange={onCheckboxChange}
        />
      )}
      <HistoryListItemCard
        dateFormat={dateFormat}
        item={item}
        name={serviceName}
      />
      <Button
        className="history-list-item-button"
        color={item.trakt && item.trakt.watchedAt ? 'primary' : 'default'}
        onClick={onButtonClick}
        variant="contained"
      >
        <SyncIcon/>
      </Button>
      <HistoryListItemCard
        dateFormat={dateFormat}
        item={item.trakt}
        name="Trakt"
      />
    </Box>
  );
}

HistoryListItem.propTypes = {
  dateFormat: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  serviceName: PropTypes.string.isRequired,
};

export { HistoryListItem };
