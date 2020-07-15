declare interface Window {
	wrappedJSObject?: Record<string, unknown>;
	Rollbar?: import('rollbar');
}

declare let XPCNativeWrapper: <T>(value: T) => T;

declare let cloneInto: <T>(value: T, window: Window) => T;

declare type PromiseResolve<T> = (value?: T | PromiseLike<T>) => void;
