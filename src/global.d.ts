declare interface Window {
	wrappedJSObject?: {
		fetch: import('./common/Requests').Fetch;
		fetchOptions: Record<string, unknown>;
		localStorage: Storage;
		netflix?: import('./streaming-services/netflix/NetflixApi').NetflixGlobalObject;
		sdk?: import('./streaming-services/hbo-go/HboGoApi').HboGoGlobalObject;
	};
	Rollbar?: import('rollbar');
}

declare let XPCNativeWrapper: <T>(value: T) => T;

declare let cloneInto: <T>(value: T, window: Window) => T;

declare type PromiseResolve<T> = (value?: T | PromiseLike<T>) => void;
