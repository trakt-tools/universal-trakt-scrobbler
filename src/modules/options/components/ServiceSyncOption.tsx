import { I18N } from '@common/I18N';
import { Tabs } from '@common/Tabs';
import { CenteredGrid } from '@components/CenteredGrid';
import { SwitchOption } from '@components/SwitchOption';
import { Service } from '@models/Service';
import { Block as BlockIcon, Launch as LaunchIcon } from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
import { memo } from 'react';
import browser from 'webextension-polyfill';

interface ServiceSyncOptionProps {
	service: Service;
	sync: boolean;
	handleChange: (optionId: string, newValue: boolean) => void;
}

const _ServiceSyncOption = ({
	service,
	sync,
	handleChange,
}: ServiceSyncOptionProps): JSX.Element => {
	const onLinkClick = async (url: string): Promise<void> => {
		await Tabs.open(url);
	};

	return (
		<CenteredGrid item xs={1}>
			{service.hasSync ? (
				<>
					<SwitchOption id="sync" value={sync} isDisabled={false} handleChange={handleChange} />
					<Tooltip title={I18N.translate('goToHistoryPage')}>
						<Box component="span">
							<IconButton
								color="inherit"
								disabled={!sync}
								size="small"
								onClick={() =>
									void onLinkClick(browser.runtime.getURL(`history.html#${service.path}`))
								}
							>
								<LaunchIcon fontSize="small" />
							</IconButton>
						</Box>
					</Tooltip>
				</>
			) : (
				<Tooltip title={I18N.translate('notAvailable')}>
					<BlockIcon fontSize="small" />
				</Tooltip>
			)}
		</CenteredGrid>
	);
};

export const ServiceSyncOption = memo(_ServiceSyncOption);
