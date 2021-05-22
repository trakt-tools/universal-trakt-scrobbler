import { CircularProgress } from '@material-ui/core';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { BrowserStorage } from '../../../common/BrowserStorage';
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
	const [content, setContent] = useState(initialContentState);

	useEffect(() => {
		const getScrobblingItem = async (): Promise<void> => {
			const { scrobblingItem } = await BrowserStorage.get('scrobblingItem');
			setContent({
				isLoading: false,
				scrobblingItem: scrobblingItem ? new Item(scrobblingItem as IItem) : null,
			});
		};

		void getScrobblingItem();
	}, []);

	useEffect(() => {
		const startListeners = () => {
			browser.storage.onChanged.addListener(onStorageChanged);
		};

		const stopListeners = () => {
			browser.storage.onChanged.removeListener(onStorageChanged);
		};

		const onStorageChanged = (
			changes: browser.storage.ChangeDict,
			areaName: browser.storage.StorageName
		) => {
			if (areaName !== 'local') {
				return;
			}
			if ('scrobblingItem' in changes) {
				setContent({
					isLoading: false,
					scrobblingItem: changes.scrobblingItem.newValue
						? new Item(changes.scrobblingItem.newValue as IItem)
						: null,
				});
			}
		};

		startListeners();
		return stopListeners;
	});

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
