import { RequestDetails } from '@common/Requests';

export interface RequestErrorOptions {
	request?: RequestDetails;
	status?: number;
	text?: string;
	isCanceled?: boolean;
	extra?: Record<string, unknown>;
}

export class RequestError extends Error {
	request?: RequestDetails;
	status?: number;
	text?: string;
	isCanceled?: boolean;
	extra?: Record<string, unknown>;

	constructor(options: RequestErrorOptions) {
		super(JSON.stringify(options));

		this.request = options.request;
		this.status = options.status;
		this.text = options.text;
		this.isCanceled = options.isCanceled;
		this.extra = options.extra;
	}
}
