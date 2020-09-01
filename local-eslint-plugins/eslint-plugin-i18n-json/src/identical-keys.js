// @ts-nocheck

const requireNoCache = require('./util/require-no-cache');
const compareTranslationsStructure = require('./util/compare-translations-structure');
const getTranslationFileSource = require('./util/get-translation-file-source');

const noDifferenceRegex = /Compared\s+values\s+have\s+no\s+visual\s+difference/i;

// suffix match each key in the mapping with the current source file path.
// pick the first match.
const getKeyStructureFromMap = (filePathMap, sourceFilePath) => {
  // do a suffix match
  const match = Object.keys(filePathMap)
    .filter(filePath => sourceFilePath.endsWith(filePath))
    .pop();
  if (match) {
    try {
      const filepath = filePathMap[match];
      return requireNoCache(filepath);
    } catch (e) {
      throw new Error(`\n Error parsing or retrieving key structure comparison file based on "filePath" mapping\n\n "${match}" => "${filePathMap[match]}".\n\n Check the "filePath" option for this rule. \n ${e}`);
    }
  }
  throw new Error('\n Current translation file does not have a matching entry in the "filePath" map.\n Check the "filePath" option for this rule.\n');
};

/*
  comparisonOptions : {
    filePath = (string | Function | Object)

    If it's a string, then it can be a file to require in order to compare
    it's key structure with the current translation file.

      - If the required value is a function, then the function is called
      with the sourceFilePath and parsed translations to retreive the key structure.

    If it's an object , then it should have a mapping b/w file names
    and what key structure file to require.

    checkDuplicateValues = boolean

    If true, the values will also be checked for duplicates,
    in comparison to the file specified in filePath.
  }
*/

const getKeyStructureToMatch = (
  options = {},
  currentTranslations,
  sourceFilePath
) => {
  let keyStructure = null;
  let { filePath } = options;

  if (typeof filePath === 'string') {
    filePath = filePath.trim();
  }

  if (!filePath) {
    return {
      errors: [
        {
          message: '"filePath" rule option not specified.',
          loc: {
            start: {
              line: 0,
              col: 0
            }
          }
        }
      ]
    };
  }

  if (typeof filePath === 'string') {
    try {
      keyStructure = requireNoCache(filePath); //eslint-disable-line
    } catch (e) {
      return {
        errors: [
          {
            message: `\n Error parsing or retrieving key structure comparison file from\n "${filePath}".\n Check the "filePath" option for this rule.\n ${e}`,
            loc: {
              start: {
                line: 0,
                col: 0
              }
            }
          }
        ]
      };
    }

    if (typeof keyStructure !== 'function') {
      return {
        keyStructure
      };
    }

    // keyStructure exported a function
    try {
      return {
        keyStructure: keyStructure(currentTranslations, sourceFilePath)
      };
    } catch (e) {
      return {
        errors: [
          {
            message: `\n Error when calling custom key structure function from\n "${filePath}".\n Check the "filePath" option for this rule.\n ${e}`,
            loc: {
              start: {
                line: 0,
                col: 0
              }
            }
          }
        ]
      };
    }
  }

  // due to eslint rule schema, we can assume the "filePath" option is an object.
  // anything else will be caught by the eslint rule schema validator.
  try {
    return {
      keyStructure: getKeyStructureFromMap(filePath, sourceFilePath)
    };
  } catch (e) {
    return {
      errors: [
        {
          message: `${e}`,
          loc: {
            start: {
              line: 0,
              col: 0
            }
          }
        }
      ]
    };
  }
};

const identicalKeys = (context, source, sourceFilePath) => {
  const { options, settings = {} } = context;

  const comparisonOptions = options[0];

  let currentTranslations = null;
  try {
    currentTranslations = JSON.parse(source);
  } catch (e) {
    // don't return any errors
    // will be caught with the valid-json rule.
    return [];
  }
  const { errors, keyStructure } = getKeyStructureToMatch(
    comparisonOptions,
    currentTranslations,
    sourceFilePath
  );

  if (errors) {
    // errors generated from trying to get the key structure
    return errors;
  }

  const { checkDuplicateValues = false } = comparisonOptions;
  const isSourceFile = sourceFilePath === comparisonOptions.filePath;
  const diffString = compareTranslationsStructure(
    settings,
    keyStructure,
    currentTranslations,
    checkDuplicateValues && !isSourceFile
  );

  if (noDifferenceRegex.test(diffString.trim())) {
    // success
    return [];
  }
  // mismatch
  return [
    {
      message: `\n${diffString}`,
      loc: {
        start: {
          line: 0,
          col: 0
        }
      }
    }
  ];
};

module.exports = {
  meta: {
    docs: {
      category: 'Consistency',
      description:
        'Verifies the key structure for the translation file matches the key structure specified in the options',
      recommended: false
    },
    schema: [
      {
        properties: {
          filePath: {
            type: ['string', 'object']
          },
          checkDuplicateValues: {
            type: 'boolean'
          }
        },
        type: 'object'
      }
    ]
  },
  create(context) {
    return {
      Program(node) {
        const { valid, source, sourceFilePath } = getTranslationFileSource({
          context,
          node
        });
        if (!valid) {
          return;
        }
        const errors = identicalKeys(context, source, sourceFilePath);
        errors.forEach((error) => {
          context.report(error);
        });
      }
    };
  }
};
