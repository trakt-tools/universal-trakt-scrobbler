import { ListItem, ListItemSecondaryAction, ListItemText, Switch } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { Events } from '../../../../services/Events';

function OptionsListItem({ option }) {
  /**
   * @returns {Promise}
   */
  async function onChange() {
    await Events.dispatch(Events.OPTIONS_CHANGE, {
      id: option.id,
      checked: !option.value,
    });
  }

  return (
    <ListItem classes={{ secondaryAction: 'options-list-item' }}>
      <ListItemText
        primary={option.name}
        secondary={option.description}
      />
      <ListItemSecondaryAction>
        <Switch
          checked={option.value}
          color="primary"
          edge="end"
          onChange={onChange}
        />
      </ListItemSecondaryAction>
    </ListItem>
  );
}

OptionsListItem.propTypes = {
  option: PropTypes.object.isRequired,
};

export { OptionsListItem };