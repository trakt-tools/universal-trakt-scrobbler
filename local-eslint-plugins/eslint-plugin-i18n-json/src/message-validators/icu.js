// @ts-nocheck

const intlMessageParser = require('intl-messageformat-parser');

// a message validator should throw if there is any error
module.exports = (message) => {
  intlMessageParser.parse(message);
};
