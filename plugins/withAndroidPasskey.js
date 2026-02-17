const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to configure Android for Passkey (WebAuthn) support
 *
 * Adds intent filters for Digital Asset Links verification
 * Required for credential manager to associate the app with the domain
 *
 * Note: You also need to configure assetlinks.json on your server:
 * https://yourdomain.com/.well-known/assetlinks.json
 */

const withAndroidPasskey = (config, options = {}) => {
  const domain = options.domain || 'taxion.fusioninsight.cloud';

  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Find the main activity
    const application = manifest.application?.[0];
    if (!application) {
      console.warn('⚠️  [Android] No application element found in AndroidManifest.xml');
      return config;
    }

    const activities = application.activity;
    if (!activities || activities.length === 0) {
      console.warn('⚠️  [Android] No activity elements found in AndroidManifest.xml');
      return config;
    }

    // Find MainActivity
    const mainActivity = activities.find(
      (activity) =>
        activity.$['android:name'] === '.MainActivity' ||
        activity.$['android:name']?.includes('MainActivity')
    );

    if (!mainActivity) {
      console.warn('⚠️  [Android] MainActivity not found');
      return config;
    }

    // Initialize intent-filter array if needed
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    // Check if passkey intent filter already exists
    const hasPasskeyFilter = mainActivity['intent-filter'].some((filter) => {
      const actions = filter.action || [];
      const categories = filter.category || [];
      return (
        actions.some((a) => a.$['android:name'] === 'android.intent.action.VIEW') &&
        categories.some((c) => c.$['android:name'] === 'android.intent.category.BROWSABLE') &&
        filter.data?.some((d) => d.$['android:host'] === domain)
      );
    });

    if (hasPasskeyFilter) {
      console.log('✅ [Android] Passkey intent filter already exists');
      return config;
    }

    // Add intent filter for Digital Asset Links (used by Credential Manager/Passkey)
    const passkeyIntentFilter = {
      $: {
        'android:autoVerify': 'true',
      },
      action: [
        {
          $: {
            'android:name': 'android.intent.action.VIEW',
          },
        },
      ],
      category: [
        {
          $: {
            'android:name': 'android.intent.category.DEFAULT',
          },
        },
        {
          $: {
            'android:name': 'android.intent.category.BROWSABLE',
          },
        },
      ],
      data: [
        {
          $: {
            'android:scheme': 'https',
            'android:host': domain,
          },
        },
      ],
    };

    mainActivity['intent-filter'].push(passkeyIntentFilter);
    console.log(`✅ [Android] Added Passkey intent filter for domain: ${domain}`);

    return config;
  });
};

module.exports = withAndroidPasskey;
