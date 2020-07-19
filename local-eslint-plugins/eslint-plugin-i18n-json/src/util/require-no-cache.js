// @ts-nocheck

/* eslint-disable global-require, import/no-dynamic-require */

// Delete the file from the require cache.
// This forces the file to be read from disk again.
// e.g) webpack dev server eslint loader support

const requireNoCache = (path) => {
  delete require.cache[path];
  return require(path);
};

module.exports = requireNoCache;
