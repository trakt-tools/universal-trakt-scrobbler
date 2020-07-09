import { Card, CardContent, CircularProgress, Divider, Typography } from '@material-ui/core';
import * as React from 'react';
import { UtsCenter } from '../../../../components/UtsCenter';
import { HistoryInfo } from '../HistoryInfo';
import { Item, IItem } from '../../../../models/Item';

interface HistoryListItemCardProps {
	dateFormat: string;
	item: Item | IItem['trakt'];
	name: string;
}

const HistoryListItemCard: React.FC<HistoryListItemCardProps> = (
	props: HistoryListItemCardProps
) => {
	const { dateFormat, item, name } = props;
	return (
		<Card className="history-list-item-card" variant="outlined">
			<CardContent>
				<Typography variant="overline">{`${browser.i18n.getMessage('on')} ${name}`}</Typography>
				<Divider className="history-list-item-divider" />
				{item ? (
					<HistoryInfo>
						{'notFound' in item ? (
							<UtsCenter>
								<Typography variant="h6">{browser.i18n.getMessage('notFound')}</Typography>
							</UtsCenter>
						) : item.type === 'show' ? (
							<>
								{item.season && item.episode && (
									<Typography variant="overline">{`S${item.season} E${item.episode}`}</Typography>
								)}
								<Typography variant="h6">{item.episodeTitle}</Typography>
								<Typography variant="subtitle2">{item.title}</Typography>
								<Divider />
								<Typography variant="overline">
									{item.watchedAt
										? `${browser.i18n.getMessage('watched')} ${item.watchedAt.format(dateFormat)}`
										: browser.i18n.getMessage('notWatched')}
								</Typography>
								{'percentageWatched' in item && item.percentageWatched !== undefined && (
									<Typography variant="caption" display="block">
										{browser.i18n.getMessage('progress', item.percentageWatched.toString())}
									</Typography>
								)}
							</>
						) : (
							<>
								{item.year && <Typography variant="overline">{item.year}</Typography>}
								<Typography variant="h6">{item.title}</Typography>
								<Divider />
								<Typography variant="overline">
									{item.watchedAt
										? `${browser.i18n.getMessage('watched')} ${item.watchedAt.format(dateFormat)}`
										: browser.i18n.getMessage('notWatched')}
								</Typography>
								{'percentageWatched' in item && item.percentageWatched !== undefined && (
									<Typography variant="caption" display="block">
										{browser.i18n.getMessage('progress', item.percentageWatched.toString())}
									</Typography>
								)}
							</>
						)}
					</HistoryInfo>
				) : (
					<UtsCenter>
						<CircularProgress />
					</UtsCenter>
				)}
			</CardContent>
		</Card>
	);
};

export { HistoryListItemCard };
