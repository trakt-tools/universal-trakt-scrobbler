import { AppBar, Button, Toolbar } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { UtsLeftRight } from '../../../components/UtsLeftRight';
import { Session } from '../../../services/Session';

function HistoryHeader({ history, isLoggedIn }) {
  /**
   * @param {string} path
   */
  function onRouteClick(path) {
    history.push(path);
  }

  /**
   * @returns {Promise}
   */
  async function onLogoutClick() {
    await Session.logout();
  }

  return (
    <AppBar
      className="history-header"
      position="sticky"
    >
      <Toolbar>
        <UtsLeftRight
          centerVertically={true}
          left={(
            <>
              <Button
                color="inherit"
                onClick={() => onRouteClick('/home')}
              >
                {browser.i18n.getMessage('home')}
              </Button>
              <Button
                color="inherit"
                onClick={() => onRouteClick('/about')}
              >
                {browser.i18n.getMessage('about')}
              </Button>
              <Button
                color="inherit"
                onClick={() => onRouteClick('/options')}
              >
                {browser.i18n.getMessage('options')}
              </Button>
            </>
          )}
          right={isLoggedIn  && (
            <Button
              color="inherit"
              onClick={onLogoutClick}
            >
              {browser.i18n.getMessage('logout')}
            </Button>
          )}
        />
      </Toolbar>
    </AppBar>
  );
}

HistoryHeader.propTypes = {
  history: PropTypes.object.isRequired,
  isLoggedIn: PropTypes.bool.isRequired,
};

export { HistoryHeader };