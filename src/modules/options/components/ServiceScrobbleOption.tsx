import { I18N } from '@common/I18N';
import { CenteredGrid } from '@components/CenteredGrid';
import { SwitchOption } from '@components/SwitchOption';
import { Service } from '@models/Service';
import { Block as BlockIcon } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { memo } from 'react';

interface ServiceScrobbleOptionProps {
	service: Service;
	scrobble: boolean;
	handleChange: (optionId: string, newValue: boolean) => void;
}

const _ServiceScrobbleOption = ({
	service,
	scrobble,
	handleChange,
}: ServiceScrobbleOptionProps): JSX.Element => {
	return (
		<CenteredGrid size={1}>
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

export const ServiceScrobbleOption = memo(_ServiceScrobbleOption);
