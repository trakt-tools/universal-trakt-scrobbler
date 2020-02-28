import { Button, CircularProgress } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { UtsCenter } from '../../../components/UtsCenter';
import { Events } from '../../../services/Events';
import { Session } from '../../../services/Session';

function LoginPage() {
  const history = useHistory();
  const [isLoading, setLoading] = useState(true);

  /**
   * @returns {Promise}
   */
  async function onLoginClick() {
    setLoading(true);
    await Session.login();
  }

  useEffect(() => {
    function startListeners() {
      Events.subscribe(Events.LOGIN_SUCCESS, onLoginSuccess);
      Events.subscribe(Events.LOGIN_ERROR, onLoginError);
    }

    function stopListeners() {
      Events.unsubscribe(Events.LOGIN_SUCCESS, onLoginSuccess);
      Events.unsubscribe(Events.LOGIN_ERROR, onLoginError);
    }

    function onLoginSuccess() {
      setLoading(false);
      history.push('/home');
    }

    function onLoginError() {
      setLoading(false);
    }

    startListeners();
    return stopListeners;
  }, []);

  useEffect(() => {
    Session.checkLogin();
  }, []);

  return (
    <UtsCenter>
      {isLoading ? (
        <CircularProgress color="secondary"/>
      ) : (
        <Button
          color="secondary"
          onClick={onLoginClick}
          variant="contained"
        >
          {browser.i18n.getMessage('login')}
        </Button>
      )}
    </UtsCenter>
  );
}

export { LoginPage };