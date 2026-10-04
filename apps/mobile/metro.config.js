const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Let Metro watch the entire monorepo root
config.watchFolders = [workspaceRoot];

// Resolve modules from both workspace and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force Metro server root to apps/mobile — prevents SDK 52 auto-detection from
// using the yarn workspace root, which would break entry file resolution.
config.server = {
  ...config.server,
  unstable_serverRoot: projectRoot,
};

module.exports = config;
