// @ts-nocheck

const jsonlint = require('jsonlint');
const isPlainObject = require('lodash.isplainobject');
const chalk = require('chalk');
const requireNoCache = require('./util/require-no-cache');
const getTranslationFileSource = require('./util/get-translation-file-source');

const lineRegex = /line\s+(\d+):?/i;

const validJSON = ([{ linter } = {}], source) => {
  const errors = [];
  try {
    let parsed;

    if (linter) {
      // use custom linter
      parsed = requireNoCache(linter)(source);
    } else {
      parsed = jsonlint.parse(source);
    }

    if (!isPlainObject(parsed)) {
      throw new SyntaxError('Translation file must be a JSON object.');
    }
  } catch (e) {
    const [, lineNumber = 0] = e.message.match(lineRegex) || [];
    errors.push({
      message: `\n${chalk.bold.red('Invalid JSON.')}\n\n${e}`,
      loc: {
        start: {
          line: Number.parseInt(lineNumber, 10),
          col: 0
        }
      }
    });
  }
  return errors;
};

module.exports = {
  meta: {
    docs: {
      category: 'Validation',
      description: 'Validates the JSON translation file',
      recommended: true
    },
    schema: [
      {
        properties: {
          linter: {
            type: 'string'
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
        const errors = validJSON(context.options, source);
        errors.forEach((error) => {
          context.report(error);
        });
      }
    };
  }
};
