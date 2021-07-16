declare interface Window {
	netflix?: import('@/netflix/NetflixApi').NetflixGlobalObject;
	sdk?: import('@/hbo-go/HboGoApi').HboGoGlobalObject;
	player?: import('@/nrk/NrkApi').NrkGlobalObject;
	Rollbar?: import('rollbar');
}

declare let XPCNativeWrapper: <T>(value: T) => T;

declare let cloneInto: <T>(value: T, window: Window) => T;

declare type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;

declare type Messages = typeof import('@locales/en/messages.json');

declare type MessageName = keyof Messages;

declare type Promisable<T> = T | PromiseLike<T>;
