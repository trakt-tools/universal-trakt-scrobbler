class _Messaging {
	async toBackground(message: GenericObject): Promise<GenericObject> {
		const response: string = await browser.runtime.sendMessage(JSON.stringify(message));
		return JSON.parse(response) as GenericObject;
	}
}

const Messaging = new _Messaging();

export { Messaging };
