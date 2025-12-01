const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['zustand'],
      },
    },
    argv
  );

  // Force zustand to use CommonJS version for web
  config.resolve.alias = {
    ...config.resolve.alias,
    // Force CommonJS version of zustand
    'zustand': path.resolve(__dirname, 'node_modules/zustand/index.js'),
    'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
    'zustand/shallow': path.resolve(__dirname, 'node_modules/zustand/shallow.js'),
  };

  // Ensure .mjs files are handled correctly
  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: 'javascript/auto',
  });

  return config;
};
