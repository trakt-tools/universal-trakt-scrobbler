import { BrowserStorage, ServiceValue } from '@common/BrowserStorage';
import { EventDispatcher } from '@common/Events';
import { I18N } from '@common/I18N';
import { Shared } from '@common/Shared';
import { Tabs } from '@common/Tabs';
import { Box, Grid, IconButton, Switch, TextField, Tooltip, Typography } from '@material-ui/core';
import BlockIcon from '@material-ui/icons/Block';
import ClearIcon from '@material-ui/icons/Clear';
import ErrorIcon from '@material-ui/icons/Error';
import LaunchIcon from '@material-ui/icons/Launch';
import { getService } from '@models/Service';
import * as moment from 'moment';
import * as React from 'react';

interface ServiceOptionProps {
	id: string;
	value: ServiceValue;
}

export const ServiceOption: React.FC<ServiceOptionProps> = (props: ServiceOptionProps) => {
	const { id, value } = props;

	const [autoSyncDays, setAutoSyncDays] = React.useState(value.autoSyncDays);

	const service = getService(id);

	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	const onScrobbleChange = async () => {
		await EventDispatcher.dispatch('SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { scrobble: !value.scrobble },
			},
		]);
	};

	const onSyncChange = async () => {
		await EventDispatcher.dispatch('SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { sync: !value.sync },
			},
		]);
	};

	const onAutoSyncChange = async () => {
		await EventDispatcher.dispatch('SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { autoSync: !value.autoSync },
			},
		]);
	};

	const onAutoSyncDaysChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const newAutoSyncDays = parseInt(event.target.value);
		setAutoSyncDays(newAutoSyncDays);
		await EventDispatcher.dispatch('SERVICE_OPTIONS_CHANGE', null, [
			{
				id,
				value: { autoSyncDays: newAutoSyncDays },
			},
		]);
	};

	const onClearLastSyncClick = async () => {
		await EventDispatcher.dispatch('DIALOG_SHOW', null, {
			title: I18N.translate('confirmClearLastSyncTitle', service.name),
			message: I18N.translate('confirmClearLastSyncMessage'),
			onConfirm: async () => {
				const { syncCache } = await BrowserStorage.get('syncCache');
				if (syncCache) {
					syncCache.items = syncCache.items.filter((item) => item.serviceId !== id);
					await BrowserStorage.set({ syncCache }, false);
				}
				await EventDispatcher.dispatch('SERVICE_OPTIONS_CHANGE', null, [
					{
						id,
						value: { lastSync: 0, lastSyncId: '' },
					},
				]);
			},
		});
	};

	return (
		<Grid item className="options-grid-item" xs={12}>
			<Grid container className="options-grid-container" spacing={10}>
				<Grid item xs={3}>
					<Typography>{service.name}</Typography>
				</Grid>
				<Grid item className="options-grid-item--centered" xs={1}>
					{service.hasScrobbler ? (
						<Switch checked={value.scrobble} color="primary" onChange={onScrobbleChange} />
					) : (
						<Tooltip title={I18N.translate('notAvailable')}>
							<BlockIcon fontSize="small" />
						</Tooltip>
					)}
				</Grid>
				<Grid item className="options-grid-item--centered" xs={1}>
					{service.hasSync ? (
						<>
							<Switch checked={value.sync} color="primary" onChange={onSyncChange} />
							<Tooltip title={I18N.translate('goToHistoryPage')}>
								<span>
									<IconButton
										color="inherit"
										disabled={!value.sync}
										size="small"
										onClick={() =>
											onLinkClick(browser.runtime.getURL(`history.html#${service.path}`))
										}
									>
										<LaunchIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
						</>
					) : (
						<Tooltip title={I18N.translate('notAvailable')}>
							<BlockIcon fontSize="small" />
						</Tooltip>
					)}
				</Grid>
				<Grid item className="options-grid-item--centered" xs={2}>
					{service.hasSync && service.hasAutoSync ? (
						<>
							<Switch
								checked={value.autoSync}
								color="primary"
								disabled={!value.sync}
								edge="start"
								onChange={onAutoSyncChange}
							/>
							<Tooltip title={I18N.translate('daysDescription')}>
								<span>
									<TextField
										className="options-grid-item--text-field"
										disabled={!value.sync || !value.autoSync}
										label={I18N.translate('days')}
										size="small"
										type="number"
										value={autoSyncDays}
										variant="outlined"
										onChange={onAutoSyncDaysChange}
									/>
								</span>
							</Tooltip>
							{value.sync && value.autoSync && value.lastSync === 0 ? (
								<Tooltip title={I18N.translate('autoSyncNotActivated')}>
									<Box ml={0.5}>
										<ErrorIcon color="error" fontSize="small" />
									</Box>
								</Tooltip>
							) : (
								<Tooltip
									title={
										<>
											{I18N.translate('clearLastSync')}
											{value.lastSync > 0 && (
												<>
													<br />
													<br />
													{I18N.translate('lastSync')}:{' '}
													{moment(value.lastSync * 1e3).format(Shared.dateFormat)}
												</>
											)}
										</>
									}
								>
									<span>
										<IconButton
											color="secondary"
											disabled={!value.sync || !value.autoSync}
											size="small"
											onClick={onClearLastSyncClick}
										>
											<ClearIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
							)}
						</>
					) : (
						<Tooltip title={I18N.translate('notAvailable')}>
							<BlockIcon fontSize="small" />
						</Tooltip>
					)}
				</Grid>
			</Grid>
		</Grid>
	);
};
