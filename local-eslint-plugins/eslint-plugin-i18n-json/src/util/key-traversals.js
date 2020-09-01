// @ts-nocheck

// case sensitive traversal orders
const keyTraversals = {
  asc: obj => Object.keys(obj).sort(),
  desc: obj => Object.keys(obj).sort((a, b) => {
    // note, objects can't have duplicate keys of the same case
    if (a < b) {
      return 1;
    }
    return -1;
  })
};

module.exports = keyTraversals;
