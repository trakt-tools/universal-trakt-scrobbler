import { CircularProgress, List, ListItem, ListItemText, Typography } from '@material-ui/core';
import * as React from "react";
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { UtsCenter } from '../../../components/UtsCenter';
import { Session } from '../../../services/Session';
import { HistoryInfo } from '../components/HistoryInfo';
import { streamingServices } from '../streaming-services/streamingServices';

const HomePage: React.FC = () => {
  const history = useHistory();
  const [isLoading, setLoading] = useState(true);

  function onRouteClick(path: string) {
    history.push(path);
  }

  useEffect(() => {
    function checkLogin() {
      if (Session.isLoggedIn) {
        setLoading(false);
      } else {
        setLoading(true);
        history.push('/login');
      }
    }

    checkLogin();
  }, []);

  return isLoading ? (
    <UtsCenter>
      <CircularProgress/>
    </UtsCenter>
  ) : (
    <HistoryInfo>
      <Typography variant="h6">{browser.i18n.getMessage('selectStreamingService')}</Typography>
      <List>
        {streamingServices.map(service => (
          <ListItem
            key={service.id}
            button={true}
            divider={true}
            onClick={() => onRouteClick(service.path)}
          >
            <ListItemText primary={service.name}/>
          </ListItem>
        ))}
      </List>
    </HistoryInfo>
  );
};

export { HomePage };
