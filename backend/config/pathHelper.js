const path = require('path');

// Determine the root directory of the project.
// In pkg packaged app, process.pkg is true and process.execPath is the path to the executable.
// In development, __dirname is backend/config, so path.resolve(__dirname, '..', '..') is the project root.
const projectRoot = process.pkg
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, '..', '..');

module.exports = {
    projectRoot
};
