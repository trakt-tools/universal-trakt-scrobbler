import { List } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { HistoryListItem } from './HistoryListItem';

function HistoryList({ dateFormat, items }) {
  return (
    <List>
      {items.map(item => (
        <HistoryListItem
          key={item.index}
          dateFormat={dateFormat}
          item={item}
        />
      ))}
    </List>
  );
}

HistoryList.propTypes = {
  dateFormat: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
};

export { HistoryList };