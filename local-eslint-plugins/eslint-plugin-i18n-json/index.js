// @ts-nocheck

/* eslint-disable global-require */

module.exports = {
  rules: {
    'valid-json': require('./src/valid-json'),
    'valid-message-syntax': require('./src/valid-message-syntax'),
    'identical-keys': require('./src/identical-keys'),
    'sorted-keys': require('./src/sorted-keys')
  },
  processors: {
    '.json': {
      preprocess: (source, filePath) =>
        // augment the json into a comment
        // along with the source path :D
        // so we can pass it to the rules

        // note: due to the spaced comment rule, include
        // spaced comments
        [`/* ${source.trim()} *//* ${filePath.trim()} */\n`],
      // since we only return one line in the preprocess step,
      // we only care about the first array of errors
      postprocess: ([errors]) => [...errors],
      supportsAutofix: true
    }
  },
  configs: {
    recommended: {
      plugins: ['@rafaelgssa/local'],
      rules: {
        '@rafaelgssa/local/valid-message-syntax': [
          2,
          {
            syntax: 'icu' // default syntax
          }
        ],
        '@rafaelgssa/local/valid-json': 2,
        '@rafaelgssa/local/sorted-keys': [
          2,
          {
            order: 'asc',
            indentSpaces: 2
          }
        ],
        '@rafaelgssa/local/identical-keys': 0
      }
    }
  }
};
