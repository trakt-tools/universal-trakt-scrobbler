import { StreamingServiceValue } from '@common/BrowserStorage';
import { I18N } from '@common/I18N';
import { StreamingServiceOption } from '@components/StreamingServiceOption';
import { Grid, ListItem, Typography } from '@material-ui/core';
import * as React from 'react';

interface StreamingServiceOptionsProps {
	options: Record<string, StreamingServiceValue>;
}

export const StreamingServiceOptions: React.FC<StreamingServiceOptionsProps> = (
	props: StreamingServiceOptionsProps
) => {
	const { options } = props;
	return (
		<ListItem>
			<Grid container spacing={2}>
				<Grid item className="options-grid-item" xs={12}>
					<Grid container className="options-grid-container" spacing={10}>
						<Grid item xs={3}>
							<Typography variant="caption">{I18N.translate('service')}</Typography>
						</Grid>
						<Grid item className="options-grid-item--centered" xs={1}>
							<Typography variant="caption">{I18N.translate('serviceScrobble')}</Typography>
						</Grid>
						<Grid item className="options-grid-item--centered" xs={1}>
							<Typography variant="caption">{I18N.translate('serviceSync')}</Typography>
						</Grid>
						<Grid item className="options-grid-item--centered" xs={2}>
							<Typography variant="caption">{I18N.translate('autoSync')}</Typography>
						</Grid>
					</Grid>
				</Grid>
				{Object.entries(options)
					.sort(([idA], [idB]) => idA.localeCompare(idB))
					.map(([id, value]) => (
						<StreamingServiceOption key={id} id={id} value={value} />
					))}
			</Grid>
		</ListItem>
	);
};
