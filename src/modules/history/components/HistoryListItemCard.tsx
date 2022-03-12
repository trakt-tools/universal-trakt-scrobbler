import { Suggestion } from '@apis/CorrectionApi';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Center } from '@components/Center';
import { HistoryListItemDivider } from '@components/HistoryListItemDivider';
import { TmdbImage } from '@components/TmdbImage';
import { Item } from '@models/Item';
import { TraktItem } from '@models/TraktItem';
import {
	Button,
	Card,
	CardContent,
	LinearProgress,
	Skeleton,
	Tooltip,
	Typography,
} from '@mui/material';

interface HistoryListItemCardProps {
	isLoading: boolean;
	item?: Item | TraktItem | null;
	name: string;
	suggestions?: Suggestion[] | null;
	imageUrl?: string | null;
	openMissingWatchedDateDialog?: () => Promise<void>;
	openCorrectionDialog?: () => Promise<void>;
}

export const HistoryListItemCard = ({
	isLoading,
	item,
	name,
	suggestions,
	imageUrl,
	openMissingWatchedDateDialog,
	openCorrectionDialog,
}: HistoryListItemCardProps): JSX.Element => {
	const watchedAt = item instanceof Item ? item.getWatchedDate() : item?.watchedAt;
	const watchedAtComponent = item ? (
		item instanceof TraktItem && typeof watchedAt === 'undefined' ? (
			<Typography variant="overline">{I18N.translate('loadingHistory')}...</Typography>
		) : watchedAt ? (
			<Typography variant="overline">
				{`${I18N.translate('watched')} ${Utils.timestamp(watchedAt)}`}
			</Typography>
		) : openMissingWatchedDateDialog ? (
			<Button color="secondary" disabled={isLoading} onClick={openMissingWatchedDateDialog}>
				<Typography variant="caption">{I18N.translate('missingWatchedDate')}</Typography>
			</Button>
		) : (
			<Typography variant="overline">{I18N.translate('notWatched')}</Typography>
		)
	) : (
		<Typography
			variant="overline"
			sx={{
				width: 0.75,
			}}
		>
			<Skeleton variant="text" />
		</Typography>
	);

	const hasImage = item instanceof TraktItem || item === null;
	return (
		<Card
			variant="outlined"
			sx={{
				position: 'relative',
				width: 350,
				marginY: 1,
				marginX: 0,
				textAlign: 'center',
				...(hasImage
					? {
							color: '#fff',
					  }
					: {}),
			}}
		>
			{hasImage && <TmdbImage imageUrl={imageUrl} />}
			<CardContent
				sx={{
					position: 'relative',
				}}
			>
				<Center isHorizontal={false}>
					<Typography variant="overline">{`${I18N.translate('on')} ${name}`}</Typography>
					<HistoryListItemDivider useDarkMode={hasImage} />
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
									<HistoryListItemDivider useDarkMode={hasImage} />
									{watchedAtComponent}
								</>
							) : (
								<>
									{item.year && <Typography variant="overline">{item.year}</Typography>}
									<Typography variant="h6">{item.title}</Typography>
									<HistoryListItemDivider useDarkMode={hasImage} />
									{watchedAtComponent}
								</>
							)}
							{openCorrectionDialog && (
								<Button color="secondary" disabled={isLoading} onClick={openCorrectionDialog}>
									<Typography variant="caption">
										{I18N.translate('isThisWrong')}{' '}
										{Shared.storage.options.sendReceiveSuggestions ? (
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
							<Typography
								variant="overline"
								sx={{
									width: 0.25,
								}}
							>
								<Skeleton variant="text" />
							</Typography>
							<Typography
								variant="h6"
								sx={{
									width: 0.75,
								}}
							>
								<Skeleton variant="text" />
							</Typography>
							<Typography
								variant="subtitle2"
								sx={{
									width: 0.5,
								}}
							>
								<Skeleton variant="text" />
							</Typography>
							<HistoryListItemDivider useDarkMode={hasImage} />
							{watchedAtComponent}
							<Typography
								variant="caption"
								sx={{
									width: 0.25,
								}}
							>
								<Skeleton variant="text" />
							</Typography>
						</>
					)}
				</Center>
			</CardContent>
			{item && item.progress > 0.0 && (
				<Tooltip title={I18N.translate('progress', item.progress.toString())}>
					<LinearProgress
						value={item.progress}
						variant="determinate"
						sx={{
							position: 'absolute',
							bottom: 0,
							width: 1,
							height: ({ spacing }) => spacing(1),
						}}
					/>
				</Tooltip>
			)}
		</Card>
	);
};
