import { Card, CardContent, CircularProgress, Divider, Typography } from '@material-ui/core';
import PropTypes from 'prop-types';
import React from 'react';
import { UtsCenter } from '../../../../components/UtsCenter';
import { HistoryInfo } from '../HistoryInfo';

function HistoryListItemCard({ dateFormat, item, name }) {
  return (
    <Card
      className="history-list-item-card"
      variant="outlined"
    >
      <CardContent>
        <Typography variant="overline">{`${browser.i18n.getMessage('on')} ${name}`}</Typography>
        <Divider className="history-list-item-divider"/>
        {item ? (
          <HistoryInfo>
            {item.notFound ? (
              <UtsCenter>
                <Typography variant="h6">{browser.i18n.getMessage('notFound')}</Typography>
              </UtsCenter>
            ) : (
              item.type === 'show' ? (
                <>
                  {item.season && item.episode && (
                    <Typography variant="overline">{`S${item.season} E${item.episode}`}</Typography>
                  )}
                  <Typography variant="h6">{item.episodeTitle}</Typography>
                  <Typography variant="subtitle2">{item.title}</Typography>
                  <Divider/>
                  <Typography variant="overline">{item.watchedAt ? `${browser.i18n.getMessage('watched')} ${item.watchedAt.format(dateFormat)}` : browser.i18n.getMessage('notWatched')}</Typography>
                  {item.percentageWatched && (
                    <Typography variant="caption" display="block">{browser.i18n.getMessage('progress', [item.percentageWatched])}</Typography>
                  )}
                </>
              ) : (
                <>
                  {item.year && (
                    <Typography variant="overline">{item.year}</Typography>
                  )}
                  <Typography variant="h6">{item.title}</Typography>
                  <Divider/>
                  <Typography variant="overline">{item.watchedAt ? `${browser.i18n.getMessage('watched')} ${item.watchedAt.format(dateFormat)}` : browser.i18n.getMessage('notWatched')}</Typography>
                  {item.percentageWatched && (
                      <Typography variant="caption" display="block">{browser.i18n.getMessage('progress', [item.percentageWatched])}</Typography>
                  )}
                </>
              )
            )}
          </HistoryInfo>
        ) : (
          <UtsCenter>
            <CircularProgress/>
          </UtsCenter>
        )}
      </CardContent>
    </Card>
  );
}

HistoryListItemCard.propTypes = {
  dateFormat: PropTypes.string.isRequired,
  item: PropTypes.object,
  name: PropTypes.string.isRequired,
};

export { HistoryListItemCard };
