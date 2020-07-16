import {
	Button,
	Card,
	CardContent,
	CircularProgress,
	Divider,
	Typography,
} from '@material-ui/core';
import * as React from 'react';
import { UtsCenter } from '../../../../components/UtsCenter';
import { Item } from '../../../../models/Item';
import { TraktItem } from '../../../../models/TraktItem';

interface HistoryListItemCardProps {
	dateFormat: string;
	item?: Item | TraktItem | null;
	name: string;
	openWrongItemDialog?: () => Promise<void>;
}

export const HistoryListItemCard: React.FC<HistoryListItemCardProps> = (
	props: HistoryListItemCardProps
) => {
	const { dateFormat, item, name, openWrongItemDialog } = props;

	return (
		<Card className="history-list-item-card" variant="outlined">
			<CardContent>
				<UtsCenter isHorizontal={false}>
					<Typography variant="overline">{`${browser.i18n.getMessage('on')} ${name}`}</Typography>
					<Divider className="history-list-item-divider" />
					{typeof item !== 'undefined' ? (
						<>
							{item === null ? (
								<Typography variant="h6">{browser.i18n.getMessage('notFound')}</Typography>
							) : item.type === 'show' ? (
								<>
									{item.season && item.episode && (
										<Typography variant="overline">{`S${item.season} E${item.episode}`}</Typography>
									)}
									<Typography variant="h6">{item.episodeTitle}</Typography>
									<Typography variant="subtitle2">{item.title}</Typography>
									<Divider className="history-list-item-divider" />
									<Typography variant="overline">
										{item.watchedAt
											? `${browser.i18n.getMessage('watched')} ${item.watchedAt.format(dateFormat)}`
											: browser.i18n.getMessage('notWatched')}
									</Typography>
									{'percentageWatched' in item && item.percentageWatched !== undefined && (
										<Typography variant="caption">
											{browser.i18n.getMessage('progress', item.percentageWatched.toString())}
										</Typography>
									)}
								</>
							) : (
								<>
									{item.year && <Typography variant="overline">{item.year}</Typography>}
									<Typography variant="h6">{item.title}</Typography>
									<Divider className="history-list-item-divider" />
									<Typography variant="overline">
										{item.watchedAt
											? `${browser.i18n.getMessage('watched')} ${item.watchedAt.format(dateFormat)}`
											: browser.i18n.getMessage('notWatched')}
									</Typography>
									{'percentageWatched' in item && item.percentageWatched !== undefined && (
										<Typography variant="caption">
											{browser.i18n.getMessage('progress', item.percentageWatched.toString())}
										</Typography>
									)}
								</>
							)}
							{openWrongItemDialog && (
								<Button color="secondary" onClick={openWrongItemDialog}>
									<Typography variant="caption">
										{browser.i18n.getMessage('isThisWrong')}
									</Typography>
								</Button>
							)}
						</>
					) : (
						<CircularProgress />
					)}
				</UtsCenter>
			</CardContent>
		</Card>
	);
};
