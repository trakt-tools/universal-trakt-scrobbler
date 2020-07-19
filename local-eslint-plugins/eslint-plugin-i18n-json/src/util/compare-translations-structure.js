// @ts-nocheck

const set = require('lodash.set');
const get = require('lodash.get');
const diff = require('jest-diff');
const deepForOwn = require('./deep-for-own');

const DIFF_OPTIONS = {
  expand: false,
  contextLines: 1
};

const noDifferenceRegex = /Compared\s+values\s+have\s+no\s+visual\s+difference/i;

// we don't care what the actual values are.
// lodash.set will automatically convert a previous string value
// into an object, if the current path states that a key is nested inside.
// reminder, deepForOwn goes from the root level to the deepest level (preorder)
const compareTranslationsStructure = (
  settings,
  translationsA,
  translationsB,
  checkDuplicateValues
) => {
  const augmentedTranslationsA = {};
  const augmentedTranslationsB = {};

  const ignorePaths = settings['@rafaelgssa/local/ignore-keys'] || [];

  const opts = {
    ignorePaths
  };

  const duplicateTranslations = {};

  deepForOwn(translationsA, (valueA, key, path) => {
    set(augmentedTranslationsA, path, 'Message<String>');
  }, opts);
  deepForOwn(translationsB, (valueB, key, path) => {
    let newValue = 'Message<String>';
    if (checkDuplicateValues) {
      set(duplicateTranslations, path, newValue);
      const valueA = get(translationsA, path);
      if (valueA === valueB) {
        newValue = valueB;
      }
    }
    set(augmentedTranslationsB, path, newValue);
  }, opts);
  const diffString = diff(augmentedTranslationsA, augmentedTranslationsB, DIFF_OPTIONS);
  if (checkDuplicateValues && noDifferenceRegex.test(diffString.trim())) {
    return diff(augmentedTranslationsB, duplicateTranslations, DIFF_OPTIONS);
  }
  return diffString;
};

module.exports = compareTranslationsStructure;
