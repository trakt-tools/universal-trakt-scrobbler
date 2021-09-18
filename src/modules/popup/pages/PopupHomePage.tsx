import { CorrectionApi } from '@apis/CorrectionApi';
import { TmdbApi } from '@apis/TmdbApi';
import { BrowserStorage, ScrobblingDetails } from '@common/BrowserStorage';
import { EventDispatcher } from '@common/Events';
import { Center } from '@components/Center';
import { PopupNotWatching } from '@components/PopupNotWatching';
import { PopupWatching } from '@components/PopupWatching';
import { Item } from '@models/Item';
import { CircularProgress } from '@mui/material';
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

export const HomePage = (): JSX.Element => {
	const [content, setContent] = useState(initialContentState);

	useEffect(() => {
		const getScrobblingItem = async (): Promise<void> => {
			const { scrobblingDetails } = await BrowserStorage.get('scrobblingDetails');
			setContent({
				isLoading: false,
				scrobblingItem: scrobblingDetails?.item ? Item.load(scrobblingDetails.item) : null,
				isPaused: scrobblingDetails?.isPaused ?? false,
			});
		};

		void getScrobblingItem();
	}, []);

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SCROBBLE_START', null, onScrobbleStart);
			EventDispatcher.subscribe('SCROBBLE_PAUSE', null, onScrobblePause);
			EventDispatcher.subscribe('SCROBBLE_STOP', null, onScrobbleStop);
			EventDispatcher.subscribe('SCROBBLE_PROGRESS', null, onScrobbleProgress);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SCROBBLE_START', null, onScrobbleStart);
			EventDispatcher.unsubscribe('SCROBBLE_PAUSE', null, onScrobblePause);
			EventDispatcher.unsubscribe('SCROBBLE_STOP', null, onScrobbleStop);
			EventDispatcher.unsubscribe('SCROBBLE_PROGRESS', null, onScrobbleProgress);
		};

		const onScrobbleStart = (data: ScrobblingDetails) => {
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

		const onScrobbleProgress = (data: ScrobblingDetails) => {
			setContent((prevContent) => ({
				...prevContent,
				scrobblingItem: data.item
					? Item.load({
							...data.item,
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
				[newItem] = await CorrectionApi.loadSuggestions([newItem]);
			}
			[newItem] = await TmdbApi.loadImages([newItem]);
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
			<Center>
				<CircularProgress color="secondary" />
			</Center>
		);
	} else if (content.scrobblingItem) {
		component = <PopupWatching item={content.scrobblingItem} isPaused={content.isPaused} />;
	} else {
		component = <PopupNotWatching />;
	}
	return component;
};
