class _Messaging {
  /**
   * @param {Object} message
   * @returns {Promise}
   */
  async toBackground(message) {
    const response = await browser.runtime.sendMessage(JSON.stringify(message));
    return JSON.parse(response);
  }
}

const Messaging = new _Messaging();

export { Messaging };