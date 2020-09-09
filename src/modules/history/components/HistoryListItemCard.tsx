import {
	Button,
	Card,
	CardContent,
	CircularProgress,
	Divider,
	Typography,
} from '@material-ui/core';
import * as React from 'react';
import { I18N } from '../../../common/I18N';
import { UtsCenter } from '../../../components/UtsCenter';
import { Item, CorrectionSuggestion } from '../../../models/Item';
import { TraktItem } from '../../../models/TraktItem';

interface HistoryListItemCardProps {
	dateFormat: string;
	item?: Item | TraktItem | null;
	name: string;
	sendReceiveSuggestions?: boolean;
	correctionSuggestions?: CorrectionSuggestion[] | null;
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
		sendReceiveSuggestions,
		correctionSuggestions,
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

	return (
		<Card className="history-list-item-card" variant="outlined">
			<CardContent>
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
									{'percentageWatched' in item && item.percentageWatched !== undefined && (
										<Typography variant="caption">
											{I18N.translate('progress', item.percentageWatched.toString())}
										</Typography>
									)}
								</>
							) : (
								<>
									{item.year && <Typography variant="overline">{item.year}</Typography>}
									<Typography variant="h6">{item.title}</Typography>
									<Divider className="history-list-item-divider" />
									{watchedAtComponent}
									{'percentageWatched' in item && item.percentageWatched !== undefined && (
										<Typography variant="caption">
											{I18N.translate('progress', item.percentageWatched.toString())}
										</Typography>
									)}
								</>
							)}
							{openWrongItemDialog && (
								<Button color="secondary" onClick={openWrongItemDialog}>
									<Typography variant="caption">
										{I18N.translate('isThisWrong')}{' '}
										{sendReceiveSuggestions ? (
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
		</Card>
	);
};
