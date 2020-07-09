class _Messaging {
	async toBackground(message: Record<string, unknown>): Promise<Record<string, unknown>> {
		const response: string = await browser.runtime.sendMessage(JSON.stringify(message));
		return JSON.parse(response) as Record<string, unknown>;
	}
}

const Messaging = new _Messaging();

export { Messaging };
