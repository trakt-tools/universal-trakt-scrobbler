declare interface Window {
	netflix?: import('@/netflix/NetflixApi').NetflixGlobalObject;
	player?: import('@/nrk/NrkApi').NrkGlobalObject;
	Rollbar?: import('rollbar');
}

declare let XPCNativeWrapper: <T>(value: T) => T;

declare let cloneInto: <T>(value: T, window: Window) => T;

declare type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;

declare type PromiseReject = (value: Error) => void;

declare type Messages = typeof import('@locales/en/messages.json');

declare type MessageName = keyof Messages;

declare type Promisable<T> = T | PromiseLike<T>;

declare type ReverseMap<T extends Record<keyof T, T[keyof T]>> = {
	[P in T[keyof T]]: {
		[K in keyof T]: T[K] extends P ? K : never;
	}[keyof T];
};

declare interface WithChildren {
	children?: React.ReactNode;
}

declare interface WithSx {
	sx?: import('@mui/system').SxProps<import('@mui/material').Theme>;
}

declare module '*.jpg' {
	const url: string;
	export default url;
}

declare module '*.png' {
	const url: string;
	export default url;
}
