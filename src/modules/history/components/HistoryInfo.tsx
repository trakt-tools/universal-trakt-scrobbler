import { Box } from '@material-ui/core';
import * as React from 'react';
import { UtsCenter } from '../../../components/UtsCenter';

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
