import { List } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { OptionsListItem } from './OptionsListItem';

function OptionsList({ options }) {
  return (
    <List>
      {options.map(option => (
        <OptionsListItem
          key={option.id}
          option={option}
        />
      ))}
    </List>
  );
}

OptionsList.propTypes = {
  options: PropTypes.array.isRequired,
};

export { OptionsList };