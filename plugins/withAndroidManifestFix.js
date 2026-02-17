const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to fix AndroidManifest.xml for Firebase
 * Adds tools:replace="android:resource" to Firebase notification color meta-data
 * to resolve manifest merger conflict with react-native-firebase
 */

const withAndroidManifestFix = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Ensure tools namespace is declared
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Find application element
    const application = manifest.application?.[0];
    if (!application) {
      console.warn('⚠️  [Android] No application element found in AndroidManifest.xml');
      return config;
    }

    // Find or create meta-data array
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Look for Firebase notification color meta-data
    const metaDataArray = application['meta-data'];
    let notificationColorMeta = metaDataArray.find(
      (meta) => meta.$['android:name'] === 'com.google.firebase.messaging.default_notification_color'
    );

    if (notificationColorMeta) {
      // Add tools:replace attribute
      notificationColorMeta.$['tools:replace'] = 'android:resource';
      console.log('✅ [Android] Added tools:replace to Firebase notification color meta-data');
    } else {
      // Meta-data doesn't exist yet, it will be added by expo-notifications plugin
      // We'll add it ourselves with the correct attributes
      metaDataArray.push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_color',
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource',
        },
      });
      console.log('✅ [Android] Added Firebase notification color meta-data with tools:replace');
    }

    return config;
  });
};

module.exports = withAndroidManifestFix;
