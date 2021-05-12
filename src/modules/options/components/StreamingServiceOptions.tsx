import { Grid, ListItem, Tooltip, Typography } from '@material-ui/core';
import HelpIcon from '@material-ui/icons/Help';
import * as React from 'react';
import { StreamingServiceValue } from '../../../common/BrowserStorage';
import { I18N } from '../../../common/I18N';
import { StreamingServiceId } from '../../../streaming-services/streaming-services';
import { StreamingServiceOption } from './StreamingServiceOption';

interface StreamingServiceOptionsProps {
	options: Record<StreamingServiceId, StreamingServiceValue>;
}

export const StreamingServiceOptions: React.FC<StreamingServiceOptionsProps> = (
	props: StreamingServiceOptionsProps
) => {
	const { options } = props;
	return (
		<ListItem>
			<Grid container>
				<Grid container className="options-grid-container">
					<Grid item className="options-grid-item options-grid-item--centered" xs={4}>
						<Typography variant="caption">{I18N.translate('service')}</Typography>
					</Grid>
					<Grid item className="options-grid-item options-grid-item--centered" xs={1}>
						<Typography variant="caption">{I18N.translate('serviceScrobble')}</Typography>
					</Grid>
					<Grid item className="options-grid-item options-grid-item--centered" xs={1}>
						<Typography variant="caption">{I18N.translate('serviceSync')}</Typography>
					</Grid>
					<Grid item className="options-grid-item options-grid-item--centered" xs={2}>
						<Typography variant="caption">{I18N.translate('autoSync')}</Typography>
						<Tooltip
							className="tooltip-icon"
							title={I18N.translate('autoSyncDescription')
								.split('\n\n')
								.map((text, i, arr) => (
									<>
										{text}
										{i < arr.length - 1 && (
											<>
												<br />
												<br />
											</>
										)}
									</>
								))}
						>
							<HelpIcon color="primary" fontSize="small" />
						</Tooltip>
					</Grid>
				</Grid>
				{(Object.entries(options) as [StreamingServiceId, StreamingServiceValue][])
					.sort(([idA], [idB]) => idA.localeCompare(idB))
					.map(([id, value]) => (
						<StreamingServiceOption key={id} id={id} value={value} />
					))}
			</Grid>
		</ListItem>
	);
};
