import { FormControlLabel, Switch, TextField } from '@material-ui/core';
import * as React from 'react';
import { EventDispatcher, Events } from '../../../../services/Events';

interface HistoryOptionsListItemProps {
  option: SyncOption
}

const HistoryOptionsListItem: React.FC<HistoryOptionsListItemProps> = ({ option }) => {

  async function onSwitchChange(): Promise<void> {
    await EventDispatcher.dispatch(Events.HISTORY_OPTIONS_CHANGE, {
      id: option.id,
      value: !option.value,
    });
  }

  async function onNumberInputChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    await EventDispatcher.dispatch(Events.HISTORY_OPTIONS_CHANGE, {
      id: option.id,
      value: parseInt(event.currentTarget.value),
    });
  }

  let component = null;
  switch (typeof option.value) {
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
};

export { HistoryOptionsListItem };
