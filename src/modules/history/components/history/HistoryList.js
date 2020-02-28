import { List } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { HistoryListItem } from './HistoryListItem';

function HistoryList({ dateFormat, items, serviceName }) {
  return (
    <List>
      {items.map(item => (
        <HistoryListItem
          key={item.index}
          dateFormat={dateFormat}
          item={item}
          serviceName={serviceName}
        />
      ))}
    </List>
  );
}

HistoryList.propTypes = {
  dateFormat: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  serviceName: PropTypes.string.isRequired,
};

export { HistoryList };
