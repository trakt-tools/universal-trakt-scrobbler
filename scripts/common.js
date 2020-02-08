function getArguments(process) {
  const args = {};
  const argv = process.argv.slice(2);
  for (const arg of argv) {
    const parts = arg.split('=');
    const key = parts[0];
    const value = parts[1] || true;
    args[key] = value;
  }
  return args;
}

module.exports = { getArguments };