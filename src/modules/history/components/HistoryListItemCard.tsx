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
import * as React from 'react';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { TmdbImage } from '../../../components/TmdbImage';
import { UtsCenter } from '../../../components/UtsCenter';
import { CorrectionSuggestion, Item } from '../../../models/Item';
import { TraktItem } from '../../../models/TraktItem';

interface HistoryListItemCardProps {
	dateFormat: string;
	item?: Item | TraktItem | null;
	name: string;
	correctionSuggestions?: CorrectionSuggestion[] | null;
	imageUrl?: string | null;
	openMissingWatchedDateDialog?: () => Promise<void>;
	openWrongItemDialog?: () => Promise<void>;
}

export const HistoryListItemCard: React.FC<HistoryListItemCardProps> = (
	props: HistoryListItemCardProps
) => {
	const {
		dateFormat,
		item,
		name,
		correctionSuggestions,
		imageUrl,
		openMissingWatchedDateDialog,
		openWrongItemDialog,
	} = props;

	const watchedAtComponent = item ? (
		item.watchedAt ? (
			<Typography variant="overline">
				{`${I18N.translate('watched')} ${item.watchedAt.format(dateFormat)}`}
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
							{openWrongItemDialog && (
								<Button color="secondary" onClick={openWrongItemDialog}>
									<Typography variant="caption">
										{I18N.translate('isThisWrong')}{' '}
										{BrowserStorage.options.sendReceiveSuggestions ? (
											typeof correctionSuggestions === 'undefined' ? (
												<>({I18N.translate('loadingSuggestions')}...)</>
											) : correctionSuggestions && correctionSuggestions.length > 0 ? (
												<>
													({I18N.translate('suggestions', correctionSuggestions.length.toString())})
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
			{item && 'percentageWatched' in item && item.percentageWatched !== undefined && (
				<Tooltip title={I18N.translate('progress', item.percentageWatched.toString())}>
					<LinearProgress
						classes={{ root: 'history-list-item-progress' }}
						value={item.percentageWatched}
						variant="determinate"
					/>
				</Tooltip>
			)}
		</Card>
	);
};
