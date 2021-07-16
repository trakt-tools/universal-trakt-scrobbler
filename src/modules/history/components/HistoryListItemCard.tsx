import { Suggestion } from '@apis/CorrectionApi';
import { BrowserStorage } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { TmdbImage } from '@components/TmdbImage';
import { UtsCenter } from '@components/UtsCenter';
import {
	Button,
	Card,
	CardContent,
	CircularProgress,
	Divider,
	LinearProgress,
	Tooltip,
	Typography,
} from '@material-ui/core';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';
import * as React from 'react';

interface HistoryListItemCardProps {
	item?: Item | TraktItem | null;
	name: string;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	openMissingWatchedDateDialog?: () => Promise<void>;
	openCorrectionDialog?: () => Promise<void>;
}

export const HistoryListItemCard: React.FC<HistoryListItemCardProps> = (
	props: HistoryListItemCardProps
) => {
	const { item, name, suggestions, imageUrl, openMissingWatchedDateDialog, openCorrectionDialog } =
		props;

	const watchedAt = item instanceof Item ? item.getWatchedDate() : item?.watchedAt;
	const watchedAtComponent = item ? (
		item instanceof TraktItem && typeof watchedAt === 'undefined' ? (
			<Typography variant="overline">{I18N.translate('loadingHistory')}...</Typography>
		) : watchedAt ? (
			<Typography variant="overline">
				{`${I18N.translate('watched')} ${watchedAt.format(Shared.dateFormat)}`}
			</Typography>
		) : openMissingWatchedDateDialog ? (
			<Button color="secondary" onClick={openMissingWatchedDateDialog}>
				<Typography variant="caption">{I18N.translate('missingWatchedDate')}</Typography>
			</Button>
		) : (
			<Typography variant="overline">{I18N.translate('notWatched')}</Typography>
		)
	) : null;

	const hasImage = !item || item instanceof TraktItem;
	return (
		<Card className={`history-list-item-card ${hasImage ? 'image' : ''}`} variant="outlined">
			{(!item || item instanceof TraktItem) && <TmdbImage imageUrl={imageUrl} />}
			<CardContent className="history-list-item-card-content">
				<UtsCenter isHorizontal={false}>
					<Typography variant="overline">{`${I18N.translate('on')} ${name}`}</Typography>
					<Divider className="history-list-item-divider" />
					{typeof item !== 'undefined' ? (
						<>
							{item === null ? (
								<Typography variant="h6">{I18N.translate('notFound')}</Typography>
							) : item.type === 'show' ? (
								<>
									{item.season && item.episode && (
										<Typography variant="overline">{`S${item.season} E${item.episode}`}</Typography>
									)}
									<Typography variant="h6">{item.episodeTitle}</Typography>
									<Typography variant="subtitle2">{item.title}</Typography>
									<Divider className="history-list-item-divider" />
									{watchedAtComponent}
								</>
							) : (
								<>
									{item.year && <Typography variant="overline">{item.year}</Typography>}
									<Typography variant="h6">{item.title}</Typography>
									<Divider className="history-list-item-divider" />
									{watchedAtComponent}
								</>
							)}
							{openCorrectionDialog && (
								<Button color="secondary" onClick={openCorrectionDialog}>
									<Typography variant="caption">
										{I18N.translate('isThisWrong')}{' '}
										{BrowserStorage.options.sendReceiveSuggestions ? (
											typeof suggestions === 'undefined' ? (
												<>({I18N.translate('loadingSuggestions')}...)</>
											) : suggestions && suggestions.length > 0 ? (
												<>
													({I18N.translate('suggestions')}: {suggestions.length.toString()})
												</>
											) : null
										) : null}
									</Typography>
								</Button>
							)}
						</>
					) : (
						<CircularProgress />
					)}
				</UtsCenter>
			</CardContent>
			{item && item.progress > 0.0 && (
				<Tooltip title={I18N.translate('progress', item.progress.toString())}>
					<LinearProgress
						classes={{ root: 'history-list-item-progress' }}
						value={item.progress}
						variant="determinate"
					/>
				</Tooltip>
			)}
		</Card>
	);
};
