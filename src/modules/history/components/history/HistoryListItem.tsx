import { Box, Button, Checkbox } from '@material-ui/core';
import SyncIcon from '@material-ui/icons/Sync';
import * as React from 'react';
import { Events, EventDispatcher } from '../../../../services/Events';
import { HistoryListItemCard } from './HistoryListItemCard';
import { Item } from '../../../../models/Item';

interface HistoryListItemProps {
  dateFormat: string,
  item: Item
  serviceName: string,
}

const HistoryListItem: React.FC<HistoryListItemProps> = ({ dateFormat, item, serviceName }) => {
  async function onCheckboxChange() {
    await EventDispatcher.dispatch(Events.STREAMING_SERVICE_HISTORY_CHANGE, {
      index: item.index,
      checked: !item.isSelected,
    });
  }

  function onButtonClick() {
    // TODO: Implement option to correct item.
  }

  return (
    <Box className="history-list-item">
      {item.trakt && !('notFound' in item.trakt) && !item.trakt.watchedAt && (
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
        color={item.trakt && ('watchedAt' in item.trakt) ? 'primary' : 'default'}
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
};

export { HistoryListItem };
