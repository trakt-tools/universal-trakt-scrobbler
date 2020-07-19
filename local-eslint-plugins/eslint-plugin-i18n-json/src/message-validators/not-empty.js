// @ts-nocheck

module.exports = (message) => {
  let normalized = message;
  if (typeof message === 'string') {
    normalized = message.trim();
  }
  if (!normalized) {
    throw new SyntaxError('Message is Empty.');
  }
};
