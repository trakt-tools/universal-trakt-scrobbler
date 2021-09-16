import { I18N } from '@common/I18N';
import { CenteredGrid } from '@components/CenteredGrid';
import { SwitchOption } from '@components/SwitchOption';
import { Service } from '@models/Service';
import { Block as BlockIcon } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

interface ServiceScrobbleOptionProps {
	service: Service;
	scrobble: boolean;
	handleChange: (optionId: string, newValue: boolean) => void;
}

const _ServiceScrobbleOption: React.FC<ServiceScrobbleOptionProps> = ({
	service,
	scrobble,
	handleChange,
}) => {
	return (
		<CenteredGrid item xs={1}>
			{service.hasScrobbler ? (
				<SwitchOption
					id="scrobble"
					value={scrobble}
					isDisabled={false}
					handleChange={handleChange}
				/>
			) : (
				<Tooltip title={I18N.translate('notAvailable')}>
					<BlockIcon fontSize="small" />
				</Tooltip>
			)}
		</CenteredGrid>
	);
};

_ServiceScrobbleOption.propTypes = {
	service: PropTypes.instanceOf(Service).isRequired,
	scrobble: PropTypes.bool.isRequired,
	handleChange: PropTypes.func.isRequired,
};

export const ServiceScrobbleOption = React.memo(_ServiceScrobbleOption);
