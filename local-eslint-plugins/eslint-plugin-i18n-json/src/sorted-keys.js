// @ts-nocheck

const set = require('lodash.set');
const equal = require('lodash.isequal');
const isPlainObject = require('lodash.isplainobject');
const deepForOwn = require('./util/deep-for-own');
const keyTraversals = require('./util/key-traversals');
const getTranslationFileSource = require('./util/get-translation-file-source');

const sortedKeys = ([{ order = 'asc', indentSpaces = 2 } = {}], source) => {
  let translations = null;

  try {
    translations = JSON.parse(source);
  } catch (e) {
    // ignore errors, this will
    // be caught by the i18n-json/valid-json rule
    return [];
  }

  // default traversal is asc.
  let traversalOrder = keyTraversals.asc;

  if (order.toLowerCase() === 'desc') {
    traversalOrder = keyTraversals.desc;
  }

  const sortedTranslations = {};
  const sortedTranslationPaths = [];

  deepForOwn(
    translations,
    (value, key, path) => {
      // if plain object, stub in a clean one to then get filled.
      set(sortedTranslations, path, isPlainObject(value) ? {} : value);
      sortedTranslationPaths.push(path);
    },
    {
      keyTraversal: traversalOrder
    }
  );

  // only need to fix if the order of the keys is not the same
  const originalTranslationPaths = [];
  deepForOwn(translations, (value, key, path) => {
    originalTranslationPaths.push(path);
  });

  if (!equal(originalTranslationPaths, sortedTranslationPaths)) {
    const sortedWithIndent = JSON.stringify(
      sortedTranslations,
      null,
      indentSpaces
    );

    return [
      {
        message: 'Keys should be sorted, please use --fix.',
        loc: {
          start: {
            line: 0,
            col: 0
          }
        },
        fix: fixer =>
          fixer.replaceTextRange([0, source.length], sortedWithIndent),
        line: 0,
        column: 0
      }
    ];
  }
  // no errors
  return [];
};

module.exports = {
  meta: {
    fixable: 'code',
    docs: {
      category: 'Stylistic Issues',
      description: 'Ensure an order for the translation keys. (Recursive)',
      recommended: true
    },
    schema: [
      {
        properties: {
          order: {
            type: 'string'
          },
          indentSpaces: {
            type: 'number'
          }
        },
        type: 'object',
        additionalProperties: false
      }
    ]
  },
  create(context) {
    return {
      Program(node) {
        const { valid, source } = getTranslationFileSource({
          context,
          node
        });
        if (!valid) {
          return;
        }
        const errors = sortedKeys(context.options, source);
        errors.forEach((error) => {
          context.report(error);
        });
      }
    };
  }
};
