// @ts-nocheck

/*
  Custom eslint formatter for eslint-plugin-i18n-json to allow better error message display.
  Heavily inspired from https://github.com/sindresorhus/eslint-formatter-pretty.
*/

/* eslint no-useless-concat: "off" */

const chalk = require('chalk');
const plur = require('plur');
const logSymbols = require('log-symbols');
const indentString = require('indent-string');
const path = require('path');

const CWD = process.cwd();

const formatter = (results) => {
  let totalErrorsCount = 0;
  let totalWarningsCount = 0;

  const formattedLintMessagesPerFile = results.map(({
    filePath,
    messages: fileMessages,
    errorCount: fileErrorCount,
    warningCount: fileWarningCount
  }) => {
    if (fileErrorCount + fileWarningCount === 0) {
      return '';
    }

    totalErrorsCount += fileErrorCount;
    totalWarningsCount += fileWarningCount;

    const relativePath = path.relative(CWD, filePath);
    const fileMessagesHeader = chalk.underline.white(relativePath);

    fileMessages.sort((a, b) => b.severity - a.severity); // display errors first

    const formattedFileMessages = fileMessages.map(({ ruleId, severity, message }) => {
      let messageHeader = severity === 1 ? `${logSymbols.warning} ${chalk.inverse.yellow(' WARNING ')}`
        : `${logSymbols.error} ${chalk.inverse.red(' ERROR ')}`;

      messageHeader += (` ${chalk.white(`(${ruleId})`)}`);

      return `\n\n${messageHeader}\n${indentString(message, 2)}`;
    }).join('');

    return `${fileMessagesHeader}${formattedFileMessages}`;
  }).filter(fileLintMessages => fileLintMessages.trim().length > 0);

  let aggregateReport = formattedLintMessagesPerFile.join('\n\n');

  // append in total error and warnings count to aggregrate report
  const totalErrorsCountFormatted = `${chalk.bold.red('>')} ${logSymbols.error} ${chalk.bold.red(totalErrorsCount)} ${chalk.bold.red(plur('ERROR', totalErrorsCount))}`;
  const totalWarningsCountFormatted = `${chalk.bold.yellow('>')} ${logSymbols.warning} ${chalk.bold.yellow(totalWarningsCount)} ${chalk.bold.yellow(plur('WARNING', totalWarningsCount))}`;

  aggregateReport += `\n\n${totalErrorsCountFormatted}\n${totalWarningsCountFormatted}`;

  return (totalErrorsCount + totalWarningsCount > 0) ? aggregateReport : '';
};

module.exports = formatter;
