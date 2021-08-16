import { I18N } from '@common/I18N';
import { Tabs } from '@common/Tabs';
import { SwitchOption } from '@components/SwitchOption';
import { Grid, IconButton, Tooltip } from '@material-ui/core';
import BlockIcon from '@material-ui/icons/Block';
import LaunchIcon from '@material-ui/icons/Launch';
import { Service } from '@models/Service';
import PropTypes from 'prop-types';
import React from 'react';
import { browser } from 'webextension-polyfill-ts';

interface ServiceSyncOptionProps {
	service: Service;
	sync: boolean;
	handleChange: (optionId: string, newValue: boolean) => void;
}

const _ServiceSyncOption: React.FC<ServiceSyncOptionProps> = ({ service, sync, handleChange }) => {
	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	return (
		<Grid item className="options-grid-item--centered" xs={1}>
			{service.hasSync ? (
				<>
					<SwitchOption id="sync" value={sync} isDisabled={false} handleChange={handleChange} />
					<Tooltip title={I18N.translate('goToHistoryPage')}>
						<span>
							<IconButton
								color="inherit"
								disabled={!sync}
								size="small"
								onClick={() => onLinkClick(browser.runtime.getURL(`history.html#${service.path}`))}
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
	);
};

_ServiceSyncOption.propTypes = {
	service: PropTypes.instanceOf(Service).isRequired,
	sync: PropTypes.bool.isRequired,
	handleChange: PropTypes.func.isRequired,
};

export const ServiceSyncOption = React.memo(_ServiceSyncOption);
