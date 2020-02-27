import { FormControlLabel, Switch, TextField } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { Events, EventDispatcher } from '../../../../services/Events';

function HistoryOptionsListItem({ option }) {
  /**
   * @returns {Promise}
   */
  async function onSwitchChange() {
    await EventDispatcher.dispatch(Events.HISTORY_OPTIONS_CHANGE, {
      id: option.id,
      value: !option.value,
    });
  }

  /**
   * @returns {Promise}
   */
  async function onNumberInputChange(event) {
    await EventDispatcher.dispatch(Events.HISTORY_OPTIONS_CHANGE, {
      id: option.id,
      value: parseInt(event.currentTarget.value),
    });
  }

  let component = null;
  switch (option.type) {
    case 'boolean': {
      component = (
        <FormControlLabel
          control={
            <Switch
              checked={option.value}
              color="primary"
              onChange={onSwitchChange}
            />
          }
          label={option.name}
        />
      );
      break;
    }
    case 'number': {
      component = (
        <TextField
          label={option.name}
          onChange={onNumberInputChange}
          type="number"
          value={option.value}
        />
      );
      break;
    }
  }
  return component;
}

HistoryOptionsListItem.propTypes = {
  option: PropTypes.object.isRequired,
};

export { HistoryOptionsListItem };