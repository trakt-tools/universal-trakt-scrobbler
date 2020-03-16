class _Messaging {
  async toBackground(message: GenericObject): Promise<GenericObject> {
    const response = await browser.runtime.sendMessage(JSON.stringify(message));
    return JSON.parse(response);
  }
}

const Messaging = new _Messaging();

export { Messaging };