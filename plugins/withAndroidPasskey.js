const { withAndroidManifest, withStringsXml } = require('@expo/config-plugins');

/**
 * Config plugin to configure Android for Passkey (WebAuthn) support
 *
 * Adds:
 * 1. Intent filters for Digital Asset Links verification
 * 2. asset_statements in strings.xml for FIDO2/Passkey
 * 3. meta-data in AndroidManifest.xml pointing to asset_statements
 *
 * Required for credential manager to associate the app with the domain
 *
 * Note: You also need to configure assetlinks.json on your server:
 * https://yourdomain.com/.well-known/assetlinks.json
 */

// Step 1: Add asset_statements to strings.xml
const withPasskeyStrings = (config, options = {}) => {
  const domain = options.domain || 'taxion.fusioninsight.cloud';

  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];

    // Check if asset_statements already exists
    const hasAssetStatements = strings.some(
      (s) => s.$?.name === 'asset_statements'
    );

    if (!hasAssetStatements) {
      // Add asset_statements string
      strings.push({
        $: {
          name: 'asset_statements',
          translatable: 'false',
        },
        _: `[{"include": "https://${domain}/.well-known/assetlinks.json"}]`,
      });
      console.log(`✅ [Android] Added asset_statements for domain: ${domain}`);
    } else {
      console.log('✅ [Android] asset_statements already exists in strings.xml');
    }

    config.modResults.resources.string = strings;
    return config;
  });
};

// Step 2: Add meta-data and intent-filter to AndroidManifest.xml
const withPasskeyManifest = (config, options = {}) => {
  const domain = options.domain || 'taxion.fusioninsight.cloud';

  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Find the main application
    const application = manifest.application?.[0];
    if (!application) {
      console.warn('⚠️  [Android] No application element found in AndroidManifest.xml');
      return config;
    }

    // Initialize meta-data array if needed
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Check if asset_statements meta-data already exists
    const hasAssetStatementsMetaData = application['meta-data'].some(
      (meta) => meta.$?.['android:name'] === 'asset_statements'
    );

    if (!hasAssetStatementsMetaData) {
      // Add meta-data for asset_statements (must be first for Passkey to work)
      application['meta-data'].unshift({
        $: {
          'android:name': 'asset_statements',
          'android:resource': '@string/asset_statements',
        },
      });
      console.log('✅ [Android] Added asset_statements meta-data to AndroidManifest.xml');
    } else {
      console.log('✅ [Android] asset_statements meta-data already exists');
    }

    // Find activities
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
        filter.$?.['android:autoVerify'] === 'true' &&
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

// Combined plugin that applies both modifications
const withAndroidPasskey = (config, options = {}) => {
  // First add strings.xml entries
  config = withPasskeyStrings(config, options);
  // Then add manifest entries
  config = withPasskeyManifest(config, options);
  return config;
};

module.exports = withAndroidPasskey;
