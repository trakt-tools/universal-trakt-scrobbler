import { Box, Button, Divider } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { BrowserStorage } from '../../../../services/BrowserStorage';
import { Events, EventDispatcher } from '../../../../services/Events';

function OptionsActions() {
  const [cacheSize, setCacheSize] = useState('0 B');

  /**
   * @returns {Promise}
   */
  async function updateTraktCacheSize() {
    setCacheSize(await BrowserStorage.getSize('traktCache'));
  }

  /**
   * @returns {Promise}
   */
  async function onClearStorageClick() {
    await EventDispatcher.dispatch(Events.DIALOG_SHOW, {
      title: browser.i18n.getMessage('confirmClearStorageTitle'),
      message: browser.i18n.getMessage('confirmClearStorageMessage'),
      onConfirm: async () => {
        try {
          await BrowserStorage.clear(true);
          await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
            messageName: 'clearStorageSuccess',
            severity: 'success',
          });
          await EventDispatcher.dispatch(Events.OPTIONS_CLEAR, {});
          await EventDispatcher.dispatch(Events.LOGOUT_SUCCESS, {});
          updateTraktCacheSize();
        } catch (err) {
          Errors.error('Failed to clear storage.', err);
          await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
            messageName: 'clearStorageFailed',
            severity: 'error',
          });
        }
      },
    });
  }

  /**
   * @returns {Promise}
   */
  async function onClearTraktCacheClick() {
    await EventDispatcher.dispatch(Events.DIALOG_SHOW, {
      title: browser.i18n.getMessage('confirmClearTraktCacheTitle'),
      message: browser.i18n.getMessage('confirmClearTraktCacheMessage'),
      onConfirm: async () => {
        try {
          await BrowserStorage.remove('traktCache');
          await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
            messageName: 'clearTraktCacheSuccess',
            severity: 'success',
          });
          updateTraktCacheSize();
        } catch (err) {
          Errors.error('Failed to clear Trakt cache.', err);
          await EventDispatcher.dispatch(Events.SNACKBAR_SHOW, {
            messageName: 'clearTraktCacheFailed',
            severity: 'error',
          });
        }
      },
    });
  }

  useEffect(() => {
    updateTraktCacheSize();
  }, []);

  return (
    <Box className="options-actions--container">
      <Divider/>
      <Box className="options-actions">
        <Button
          onClick={onClearStorageClick}
          variant="contained"
        >
          {browser.i18n.getMessage('clearStorage')}
        </Button>
        <Button
          onClick={onClearTraktCacheClick}
          variant="contained"
        >
          {browser.i18n.getMessage('clearTraktCache')} (<span>{cacheSize}</span>)
        </Button>
      </Box>
    </Box>
  );
}

export { OptionsActions };