import { Suggestion } from '@apis/CorrectionApi';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Utils } from '@common/Utils';
import { Center } from '@components/Center';
import { HistoryListItemDivider } from '@components/HistoryListItemDivider';
import { TmdbImage } from '@components/TmdbImage';
import { isItem, ScrobbleItem } from '@models/Item';
import { isTraktItem, TraktItem } from '@models/TraktItem';
import {
	Button,
	Card,
	CardContent,
	LinearProgress,
	Link,
	Skeleton,
	Tooltip,
	Typography,
} from '@mui/material';

interface HistoryListItemCardProps {
	isLoading: boolean;
	item?: ScrobbleItem | TraktItem | null;
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
	const watchedAt = isItem(item) ? item.getWatchedDate() : item?.watchedAt;
	let watchedAtComponent;
	if (item) {
		if (watchedAt) {
			if (isItem(item)) {
				watchedAtComponent = (
					<Typography variant="overline">
						{`${I18N.translate('watched')} ${Utils.timestamp(watchedAt)}`}
					</Typography>
				);
			} else {
				watchedAtComponent = (
					<Typography variant="overline">
						<Link
							href={item.getHistoryUrl()}
							target="_blank"
							rel="noreferrer"
							sx={{
								color: 'inherit',
								textDecorationColor: 'inherit',
								textDecorationStyle: 'dotted',
							}}
						>
							{`${I18N.translate('watched')} ${Utils.timestamp(watchedAt)}`}
						</Link>
					</Typography>
				);
			}
		} else if (isTraktItem(item) && typeof watchedAt === 'undefined') {
			watchedAtComponent = (
				<Typography variant="overline">{I18N.translate('loadingHistory')}...</Typography>
			);
		} else if (openMissingWatchedDateDialog) {
			watchedAtComponent = (
				<Button
					color="secondary"
					disabled={isLoading}
					onClick={() => void openMissingWatchedDateDialog()}
				>
					<Typography variant="caption">{I18N.translate('missingWatchedDate')}</Typography>
				</Button>
			);
		} else {
			watchedAtComponent = (
				<Typography variant="overline">{I18N.translate('notWatched')}</Typography>
			);
		}
	} else {
		watchedAtComponent = (
			<Typography
				variant="overline"
				sx={{
					width: 0.75,
				}}
			>
				<Skeleton variant="text" />
			</Typography>
		);
	}

	const hasImage = isTraktItem(item) || item === null;
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
							) : item.type === 'episode' ? (
								<>
									{item.season > 0 && item.number > 0 && (
										<Typography variant="overline">{`S${item.season} E${item.number}`}</Typography>
									)}
									<Typography
										variant="h6"
										noWrap
										style={{ overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}
										title={item.title}
									>
										{item.title}
									</Typography>
									<Typography variant="subtitle2">{item.show.title}</Typography>
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
								<Button
									color="secondary"
									disabled={isLoading}
									onClick={() => void openCorrectionDialog()}
								>
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
