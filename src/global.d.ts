declare interface Window {
	netflix?: import('@/netflix/NetflixApi').NetflixGlobalObject;
	player?: import('@/nrk/NrkApi').NrkGlobalObject;
	Rollbar?: import('rollbar');
}

declare let XPCNativeWrapper: <T>(value: T) => T;

declare let cloneInto: <T>(value: T, window: Window) => T;

declare type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;

declare type Messages = typeof import('@locales/en/messages.json');

declare type MessageName = keyof Messages;

declare type Promisable<T> = T | PromiseLike<T>;

declare type ReverseMap<T extends Record<keyof T, T[keyof T]>> = {
	[P in T[keyof T]]: {
		[K in keyof T]: T[K] extends P ? K : never;
	}[keyof T];
};
