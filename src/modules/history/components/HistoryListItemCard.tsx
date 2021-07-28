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
	Divider,
	LinearProgress,
	Tooltip,
	Typography,
} from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';
import PropTypes from 'prop-types';
import React from 'react';

interface HistoryListItemCardProps {
	isLoading: boolean;
	item?: Item | TraktItem | null;
	name: string;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	openMissingWatchedDateDialog?: () => Promise<void>;
	openCorrectionDialog?: () => Promise<void>;
}

export const HistoryListItemCard: React.FC<HistoryListItemCardProps> = ({
	isLoading,
	item,
	name,
	suggestions,
	imageUrl,
	openMissingWatchedDateDialog,
	openCorrectionDialog,
}) => {
	const watchedAt = item instanceof Item ? item.getWatchedDate() : item?.watchedAt;
	const watchedAtComponent = item ? (
		item instanceof TraktItem && typeof watchedAt === 'undefined' ? (
			<Typography variant="overline">{I18N.translate('loadingHistory')}...</Typography>
		) : watchedAt ? (
			<Typography variant="overline">
				{`${I18N.translate('watched')} ${watchedAt.format(Shared.dateFormat)}`}
			</Typography>
		) : openMissingWatchedDateDialog ? (
			<Button color="secondary" disabled={isLoading} onClick={openMissingWatchedDateDialog}>
				<Typography variant="caption">{I18N.translate('missingWatchedDate')}</Typography>
			</Button>
		) : (
			<Typography variant="overline">{I18N.translate('notWatched')}</Typography>
		)
	) : (
		<Typography variant="overline" style={{ width: '75%' }}>
			<Skeleton variant="text" />
		</Typography>
	);

	const hasImage = item instanceof TraktItem;
	return (
		<Card className={`history-list-item-card ${hasImage ? 'image' : ''}`} variant="outlined">
			{hasImage && <TmdbImage imageUrl={imageUrl} />}
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
								<Button color="secondary" disabled={isLoading} onClick={openCorrectionDialog}>
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
						<>
							<Typography variant="overline" style={{ width: '25%' }}>
								<Skeleton variant="text" />
							</Typography>
							<Typography variant="h6" style={{ width: '75%' }}>
								<Skeleton variant="text" />
							</Typography>
							<Typography variant="subtitle2" style={{ width: '50%' }}>
								<Skeleton variant="text" />
							</Typography>
							<Divider className="history-list-item-divider" />
							{watchedAtComponent}
							<Typography variant="caption" style={{ width: '25%' }}>
								<Skeleton variant="text" />
							</Typography>
						</>
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

HistoryListItemCard.propTypes = {
	isLoading: PropTypes.bool.isRequired,
	item: PropTypes.oneOfType([PropTypes.instanceOf(Item), PropTypes.instanceOf(TraktItem)]),
	name: PropTypes.string.isRequired,
	suggestions: PropTypes.array,
	imageUrl: PropTypes.string,
	openMissingWatchedDateDialog: PropTypes.func,
	openCorrectionDialog: PropTypes.func,
};
