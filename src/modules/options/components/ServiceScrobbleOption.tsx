import { I18N } from '@common/I18N';
import { CenteredGrid } from '@components/CenteredGrid';
import { SwitchOption } from '@components/SwitchOption';
import { Service } from '@models/Service';
import { Block as BlockIcon } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
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
}: ServiceScrobbleOptionProps) => {
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

export const ServiceScrobbleOption = React.memo(_ServiceScrobbleOption);
