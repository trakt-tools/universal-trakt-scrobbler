import { Button, Typography } from '@material-ui/core';
import React from 'react';
import { Messaging } from '../../../services/Messaging';
import { HistoryInfo } from '../components/HistoryInfo';

function AboutPage() {
  /**
   * @param {string} url
   * @returns {Promise}
   */
  async function onLinkClick(url) {
    await Messaging.toBackground({ action: 'create-tab', url });
  }

  return (
    <HistoryInfo>
      <Typography variant="h6">{browser.i18n.getMessage('aboutMessage')}</Typography>
      <Button
        color="secondary"
        onClick={() => onLinkClick('https://github.com/trakt-tools/universal-trakt-sync')}
        variant="contained"
      >
        {browser.i18n.getMessage('readMore')}
      </Button>
    </HistoryInfo>
  );
}

export { AboutPage };