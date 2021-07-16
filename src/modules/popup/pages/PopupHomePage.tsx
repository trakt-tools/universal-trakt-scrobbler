import { TmdbApi } from '@apis/TmdbApi';
import { WrongItemApi } from '@apis/WrongItemApi';
import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher, ScrobbleStartData, ScrobblingItemUpdateData } from '@common/Events';
import { Messaging } from '@common/Messaging';
import { PopupNotWatching } from '@components/PopupNotWatching';
import { PopupWatching } from '@components/PopupWatching';
import { UtsCenter } from '@components/UtsCenter';
import { CircularProgress } from '@material-ui/core';
import { Item } from '@models/Item';
import * as React from 'react';
import { useEffect, useState } from 'react';

interface IPopupHomeContent {
	isLoading: boolean;
	scrobblingItem: Item | null;
	isPaused: boolean;
}

const initialContentState: IPopupHomeContent = {
	isLoading: true,
	scrobblingItem: null,
	isPaused: false,
};

export const HomePage: React.FC = () => {
	const [content, setContent] = useState(initialContentState);

	useEffect(() => {
		const getScrobblingItem = async (): Promise<void> => {
			const { item, isPaused } = await Messaging.toBackground({ action: 'get-scrobbling-info' });
			setContent({
				isLoading: false,
				scrobblingItem: item ? Item.load(item) : null,
				isPaused,
			});
		};

		void getScrobblingItem();
	}, []);

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SCROBBLE_START', null, onScrobbleStart);
			EventDispatcher.subscribe('SCROBBLE_PAUSE', null, onScrobblePause);
			EventDispatcher.subscribe('SCROBBLE_STOP', null, onScrobbleStop);
			EventDispatcher.subscribe('SCROBBLING_ITEM_UPDATE', null, onScrobblingItemUpdate);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SCROBBLE_START', null, onScrobbleStart);
			EventDispatcher.unsubscribe('SCROBBLE_PAUSE', null, onScrobblePause);
			EventDispatcher.unsubscribe('SCROBBLE_STOP', null, onScrobbleStop);
			EventDispatcher.unsubscribe('SCROBBLING_ITEM_UPDATE', null, onScrobblingItemUpdate);
		};

		const onScrobbleStart = (data: ScrobbleStartData) => {
			setContent((prevContent) => ({
				...prevContent,
				scrobblingItem: data.item
					? Item.load({
							...data.item,
							suggestions: prevContent.scrobblingItem?.suggestions,
							imageUrl: prevContent.scrobblingItem?.imageUrl,
					  })
					: null,
				isPaused: false,
			}));
		};

		const onScrobblePause = () => {
			setContent((prevContent) => ({
				...prevContent,
				isPaused: true,
			}));
		};

		const onScrobbleStop = () => {
			setContent((prevContent) => ({
				...prevContent,
				scrobblingItem: null,
				isPaused: false,
			}));
		};

		const onScrobblingItemUpdate = (data: ScrobblingItemUpdateData) => {
			setContent((prevContent) => ({
				...prevContent,
				scrobblingItem: data.scrobblingItem
					? Item.load({
							...data.scrobblingItem,
							suggestions: prevContent.scrobblingItem?.suggestions,
							imageUrl: prevContent.scrobblingItem?.imageUrl,
					  })
					: null,
			}));
		};

		startListeners();
		return stopListeners;
	}, []);

	useEffect(() => {
		const loadData = async () => {
			if (
				!content.scrobblingItem ||
				(BrowserStorage.options.sendReceiveSuggestions &&
					typeof content.scrobblingItem.suggestions !== 'undefined') ||
				typeof content.scrobblingItem.imageUrl !== 'undefined'
			) {
				return;
			}
			let newItem = content.scrobblingItem;
			if (BrowserStorage.options.sendReceiveSuggestions) {
				newItem = await WrongItemApi.loadItemSuggestions(newItem);
			}
			newItem = await TmdbApi.loadItemImage(newItem);
			setContent((prevContent) => ({
				...prevContent,
				scrobblingItem: newItem,
			}));
		};

		void loadData();
	}, [content.scrobblingItem]);

	let component = null;
	if (content.isLoading) {
		component = (
			<UtsCenter>
				<CircularProgress color="secondary" />
			</UtsCenter>
		);
	} else if (content.scrobblingItem) {
		component = <PopupWatching item={content.scrobblingItem} isPaused={content.isPaused} />;
	} else {
		component = <PopupNotWatching />;
	}
	return component;
};
