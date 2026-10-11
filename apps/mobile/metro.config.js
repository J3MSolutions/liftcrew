// Expo SDK 52+ detects npm workspaces and adds the monorepo root to watchFolders and
// nodeModulesPaths, so @liftcrew/shared (TypeScript source, main: src/index.ts) resolves
// through the workspace symlink in the root node_modules and is transpiled by Babel.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
