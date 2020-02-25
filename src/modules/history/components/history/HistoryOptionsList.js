import { Button, ButtonGroup, FormGroup, Typography } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { HistoryOptionsListItem } from './HistoryOptionsListItem';

function HistoryOptionsList({ options, store }) {
  return (
    <FormGroup className="history-options-list-container">
      {options.map(option => (
        <HistoryOptionsListItem
          key={option.id}
          option={option}
        />
      ))}
      <Typography variant="overline">{browser.i18n.getMessage('select')}</Typography>
      <ButtonGroup variant="contained">
        <Button
          onClick={store.selectAll}
        >
          {browser.i18n.getMessage('selectAll')}
        </Button>
        <Button
          onClick={store.selectNone}
        >
          {browser.i18n.getMessage('selectNone')}
        </Button>
        <Button
          onClick={store.toggleAll}
        >
          {browser.i18n.getMessage('toggleAll')}
        </Button>
      </ButtonGroup>
    </FormGroup>
  );
}

HistoryOptionsList.propTypes = {
  options: PropTypes.array.isRequired,
};

export { HistoryOptionsList };
