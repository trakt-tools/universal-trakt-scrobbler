import { CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BrowserStorage } from '../../../common/BrowserStorage';
import { Session } from '../../../common/Session';
import { UtsCenter } from '../../../components/UtsCenter';
import { IItem, Item } from '../../../models/Item';
import { PopupNotWatching } from '../components/PopupNotWatching';
import { PopupWatching } from '../components/PopupWatching';

interface IPopupHomeContent {
	isLoading: boolean;
	scrobblingItem: Item | null;
}

const initialContentState: IPopupHomeContent = {
	isLoading: true,
	scrobblingItem: null,
};

export const HomePage: React.FC = () => {
	const history = useHistory();
	const [content, setContent] = useState(initialContentState);

	useEffect(() => {
		const getScrobblingItem = async (): Promise<void> => {
			if (Session.isLoggedIn) {
				const { scrobblingItem } = await BrowserStorage.get('scrobblingItem');
				setContent({
					isLoading: false,
					scrobblingItem: scrobblingItem ? new Item(scrobblingItem as IItem) : null,
				});
			} else {
				setContent({ ...initialContentState });
				history.push('/login');
			}
		};

		void getScrobblingItem();
	}, []);

	let component = null;
	if (content.isLoading) {
		component = (
			<UtsCenter>
				<CircularProgress color="secondary" />
			</UtsCenter>
		);
	} else if (content.scrobblingItem) {
		component = <PopupWatching item={content.scrobblingItem} />;
	} else {
		component = <PopupNotWatching />;
	}
	return component;
};
