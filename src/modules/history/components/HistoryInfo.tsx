import { UtsCenter } from '@components/UtsCenter';
import { Box } from '@material-ui/core';
import React from 'react';

interface HistoryInfoProps {
	children?: React.ReactNode;
}

export const HistoryInfo: React.FC = (props: HistoryInfoProps) => {
	const { children } = props;
	return (
		<UtsCenter>
			<Box className="history-info">{children}</Box>
		</UtsCenter>
	);
};
