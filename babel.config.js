module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@api': './src/api',
            '@services': './src/services',
            '@types': './src/types',
            '@shared': './src/shared',
            '@shared/hooks': './src/shared/hooks',
            '@shared/utils': './src/shared/utils',
            '@shared/constants': './src/shared/constants',
            '@shared/contexts': './src/shared/contexts',
            '@shared/store': './src/shared/store',
            '@shared/api': './src/shared/api',
            '@features': './src/features',
            '@auth': './src/features/auth',
            '@chat': './src/features/chat',
            '@tasks': './src/features/tasks',
            '@calendar': './src/features/calendar',
            '@polls': './src/features/polls',
            '@profile': './src/features/profile',
            '@notifications': './src/features/notifications',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};