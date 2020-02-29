import { Container } from '@material-ui/core';
import { createBrowserHistory } from 'history';
import React, { useEffect, useState } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { UtsDialog } from '../../components/UtsDialog';
import { UtsSnackbar } from '../../components/UtsSnackbar';
import { Events, EventDispatcher } from '../../services/Events';
import { Session } from '../../services/Session';
import { HistoryHeader } from './components/HistoryHeader';
import { AboutPage } from './pages/AboutPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { OptionsPage } from './pages/OptionsPage.';
import { streamingServices } from './streaming-services/streamingServices';

const history =  createBrowserHistory();

function HistoryApp() {
  const [isLoggedIn, setLoggedIn] = useState(Session.isLoggedIn);

  useEffect(() => {
    function startListeners() {
      EventDispatcher.subscribe(Events.LOGIN_SUCCESS, onLogin);
      EventDispatcher.subscribe(Events.LOGOUT_SUCCESS, onLogout);
    }

    function stopListeners() {
      EventDispatcher.unsubscribe(Events.LOGIN_SUCCESS, onLogin);
      EventDispatcher.unsubscribe(Events.LOGOUT_SUCCESS, onLogout);
    }

    function onLogin() {
      setLoggedIn(true);
    }

    function onLogout() {
      setLoggedIn(false);
      history.push('/login');
    }

    startListeners();
    return stopListeners;
  }, []);

  return (
    <ErrorBoundary>
      <HistoryHeader
        history={history}
        isLoggedIn={isLoggedIn}
      />
      <Container className="history-container">
        <Router history={history}>
          <Switch>
            <Route
              component={LoginPage}
              path="/login"
            />
            <Route
              component={HomePage}
              path="/home"
            />
            <Route
              component={AboutPage}
              path="/about"
            />
            <Route
              component={OptionsPage}
              path="/options"
            />
            {streamingServices.map(service => (
              <Route
                key={service.id}
                component={service.page}
                path={service.path}
              />
            ))}
            <Redirect to="/login"/>
          </Switch>
        </Router>
        <UtsDialog/>
        <UtsSnackbar/>
      </Container>
    </ErrorBoundary>
  );
}

export { HistoryApp };