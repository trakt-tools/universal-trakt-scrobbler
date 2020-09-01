// @ts-nocheck

module.exports = (message) => {
  if (typeof message !== 'string') {
    throw new TypeError('Message must be a String.');
  }
};
