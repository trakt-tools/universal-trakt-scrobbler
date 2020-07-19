// @ts-nocheck

const isPlainObject = require('lodash.isplainobject');

/*
  deep level order traversal.
  Takes the `keyTraversal` iterator
  which specify in what order the current level's
  key should be visited.

  // calls iteratee with the path to the object.
*/

const shouldIgnorePath = (ignoreList, keyPath) => ignoreList.includes(keyPath.join('.'));
const defaultTraversal = obj => Object.keys(obj);

const deepForOwn = (obj, iteratee, {
  keyTraversal = defaultTraversal,
  ignorePaths = []
} = {}) => {
  const queue = [];
  queue.push({
    currentObj: obj,
    path: []
  });
  while (queue.length > 0) {
    const { currentObj, path } = queue.shift();
    const levelSuccess = keyTraversal(currentObj).every((key) => {
      const keyPath = [...path, key];
      // skip over ignored paths and their children
      if (shouldIgnorePath(ignorePaths, keyPath)) {
        return true;
      }
      if (isPlainObject(currentObj[key])) {
        queue.push({
          currentObj: currentObj[key],
          path: keyPath
        });
      }
      return iteratee(currentObj[key], key, keyPath) !== false;
    });
    if (!levelSuccess) {
      break;
    }
  }
};

module.exports = deepForOwn;
