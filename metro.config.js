const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Extend sourceExts to support mjs
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Block electron directory from being bundled
config.resolver.blockList = [
  /electron\/.*/,
  /dist-electron\/.*/,
  /node_modules[\/\\]electron[\/\\].*/,
];

// CRITICAL FIX: Custom resolver to force CommonJS for problematic packages on web
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block electron directory
  if (moduleName.includes('electron/') || moduleName.includes('electron\\')) {
    return {
      type: 'empty',
    };
  }

  // Force CommonJS versions for web platform only
  if (platform === 'web') {
    // Redirect zustand ESM to CommonJS
    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
      const newModuleName = moduleName.replace(/\/esm\//, '/');
      try {
        return context.resolveRequest(context, newModuleName, platform);
      } catch (e) {
        // Fallback to original
      }
    }

    // Block react-native-nitro-modules on web (not compatible with Metro web)
    if (moduleName.includes('react-native-nitro-modules')) {
      // Create a mock module that does nothing on web
      return {
        type: 'empty',
      };
    }

    // Block any .mjs files for web to prevent import.meta issues
    if (moduleName.endsWith('.mjs') || moduleName.endsWith('.mts')) {
      const cjsModule = moduleName.replace(/\.m[jt]s$/, '.js');
      try {
        return context.resolveRequest(context, cjsModule, platform);
      } catch (e) {
        // Fallback to original
      }
    }
  }

  // Use original resolver as fallback
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Force resolution to prefer CommonJS over ESM
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Transformer configuration
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
