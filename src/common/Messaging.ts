import { MessageRequest } from '../modules/background/background';

class _Messaging {
	toBackground = async (message: MessageRequest): Promise<Record<string, unknown>> => {
		const response: string = await browser.runtime.sendMessage(JSON.stringify(message));
		return JSON.parse(response) as Record<string, unknown>;
	};
}

export const Messaging = new _Messaging();
