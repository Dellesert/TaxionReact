const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');

const TEAM_ID = 'QNVQ55232N';
const NSE_TARGET_NAME = 'NotificationServiceExtension';
const NSE_BUNDLE_ID_SUFFIX = '.NotificationServiceExtension';

/**
 * Config plugin to add a Notification Service Extension (NSE) target to the Xcode project.
 *
 * The NSE intercepts push notifications with mutable-content=1,
 * downloads the sender avatar, crops it to a circle,
 * and attaches it to the notification for rich display on iOS.
 *
 * Files must exist at:
 *   ios/NotificationServiceExtension/NotificationService.swift
 *   ios/NotificationServiceExtension/NotificationServiceExtension-Info.plist
 */
const withNotificationServiceExtension = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const bundleIdentifier = config.ios?.bundleIdentifier || 'com.dellesert.tachyon-messenger';
    const nseBundleId = bundleIdentifier + NSE_BUNDLE_ID_SUFFIX;
    const buildNumber = config.ios?.buildNumber || '1';
    const version = config.version || '1.0.0';

    // Check if the target already exists (idempotent)
    const targets = project.pbxNativeTargetSection();
    for (const key in targets) {
      if (targets[key].name === NSE_TARGET_NAME) {
        console.log(`[withNotificationServiceExtension] Target "${NSE_TARGET_NAME}" already exists, updating build settings only.`);
        updateBuildSettings(project, nseBundleId, buildNumber, version);
        return config;
      }
    }

    // --- Add file references ---

    // NotificationService.swift
    const swiftFileRef = project.generateUuid();
    const swiftBuildFileRef = project.generateUuid();

    project.hash.project.objects['PBXFileReference'][swiftFileRef] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'sourcecode.swift',
      name: 'NotificationService.swift',
      path: 'NotificationService.swift',
      sourceTree: '"<group>"',
    };
    project.hash.project.objects['PBXFileReference'][`${swiftFileRef}_comment`] = 'NotificationService.swift';

    project.hash.project.objects['PBXBuildFile'][swiftBuildFileRef] = {
      isa: 'PBXBuildFile',
      fileRef: swiftFileRef,
      fileRef_comment: 'NotificationService.swift',
    };
    project.hash.project.objects['PBXBuildFile'][`${swiftBuildFileRef}_comment`] = 'NotificationService.swift in Sources';

    // Info.plist
    const plistFileRef = project.generateUuid();

    project.hash.project.objects['PBXFileReference'][plistFileRef] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.xml',
      name: 'NotificationServiceExtension-Info.plist',
      path: 'NotificationServiceExtension-Info.plist',
      sourceTree: '"<group>"',
    };
    project.hash.project.objects['PBXFileReference'][`${plistFileRef}_comment`] = 'NotificationServiceExtension-Info.plist';

    // --- Add PBXGroup ---
    const groupUuid = project.generateUuid();
    project.hash.project.objects['PBXGroup'][groupUuid] = {
      isa: 'PBXGroup',
      children: [
        { value: swiftFileRef, comment: 'NotificationService.swift' },
        { value: plistFileRef, comment: 'NotificationServiceExtension-Info.plist' },
      ],
      name: NSE_TARGET_NAME,
      path: NSE_TARGET_NAME,
      sourceTree: '"<group>"',
    };
    project.hash.project.objects['PBXGroup'][`${groupUuid}_comment`] = NSE_TARGET_NAME;

    // Add group to main group
    const mainGroupId = project.hash.project.rootObject_comment
      ? project.getFirstProject().firstProject.mainGroup
      : Object.keys(project.hash.project.objects['PBXGroup']).find(
          (key) => !key.endsWith('_comment') && project.hash.project.objects['PBXGroup'][key].name === undefined && project.hash.project.objects['PBXGroup'][key].path === undefined
        );

    const mainGroup = project.hash.project.objects['PBXGroup'][mainGroupId || project.getFirstProject().firstProject.mainGroup];
    if (mainGroup && mainGroup.children) {
      mainGroup.children.push({
        value: groupUuid,
        comment: NSE_TARGET_NAME,
      });
    }

    // --- Add product reference ---
    const productFileRef = project.generateUuid();
    project.hash.project.objects['PBXFileReference'][productFileRef] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${NSE_TARGET_NAME}.appex`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    };
    project.hash.project.objects['PBXFileReference'][`${productFileRef}_comment`] = `${NSE_TARGET_NAME}.appex`;

    // Add to Products group
    const productsGroup = Object.keys(project.hash.project.objects['PBXGroup']).find(
      (key) => !key.endsWith('_comment') && project.hash.project.objects['PBXGroup'][key].name === 'Products'
    );
    if (productsGroup) {
      project.hash.project.objects['PBXGroup'][productsGroup].children.push({
        value: productFileRef,
        comment: `${NSE_TARGET_NAME}.appex`,
      });
    }

    // --- Build phases ---

    // Sources build phase
    const sourcesBuildPhaseUuid = project.generateUuid();
    project.hash.project.objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [
        { value: swiftBuildFileRef, comment: 'NotificationService.swift in Sources' },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXSourcesBuildPhase'][`${sourcesBuildPhaseUuid}_comment`] = 'Sources';

    // Frameworks build phase (empty, no frameworks needed)
    const frameworksBuildPhaseUuid = project.generateUuid();
    project.hash.project.objects['PBXFrameworksBuildPhase'][frameworksBuildPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXFrameworksBuildPhase'][`${frameworksBuildPhaseUuid}_comment`] = 'Frameworks';

    // Resources build phase (empty)
    const resourcesBuildPhaseUuid = project.generateUuid();
    project.hash.project.objects['PBXResourcesBuildPhase'] = project.hash.project.objects['PBXResourcesBuildPhase'] || {};
    project.hash.project.objects['PBXResourcesBuildPhase'][resourcesBuildPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXResourcesBuildPhase'][`${resourcesBuildPhaseUuid}_comment`] = 'Resources';

    // --- Build configurations ---
    const debugConfigUuid = project.generateUuid();
    const releaseConfigUuid = project.generateUuid();
    const configListUuid = project.generateUuid();

    const commonBuildSettings = {
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: buildNumber,
      DEVELOPMENT_TEAM: TEAM_ID,
      GENERATE_INFOPLIST_FILE: 'YES',
      INFOPLIST_FILE: `${NSE_TARGET_NAME}/${NSE_TARGET_NAME}-Info.plist`,
      IPHONEOS_DEPLOYMENT_TARGET: '15.1',
      LD_RUNPATH_SEARCH_PATHS: [
        '"$(inherited)"',
        '"@executable_path/Frameworks"',
        '"@executable_path/../../Frameworks"',
      ],
      MARKETING_VERSION: version,
      PRODUCT_BUNDLE_IDENTIFIER: `"${nseBundleId}"`,
      PRODUCT_NAME: NSE_TARGET_NAME,
      SKIP_INSTALL: 'YES',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
    };

    project.hash.project.objects['XCBuildConfiguration'][debugConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonBuildSettings,
        OTHER_SWIFT_FLAGS: '"$(inherited) -D EXPO_CONFIGURATION_DEBUG"',
        GCC_PREPROCESSOR_DEFINITIONS: ['"DEBUG=1"', '"$(inherited)"'],
      },
      name: 'Debug',
    };
    project.hash.project.objects['XCBuildConfiguration'][`${debugConfigUuid}_comment`] = 'Debug';

    project.hash.project.objects['XCBuildConfiguration'][releaseConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonBuildSettings,
        OTHER_SWIFT_FLAGS: '"$(inherited) -D EXPO_CONFIGURATION_RELEASE"',
      },
      name: 'Release',
    };
    project.hash.project.objects['XCBuildConfiguration'][`${releaseConfigUuid}_comment`] = 'Release';

    project.hash.project.objects['XCConfigurationList'][configListUuid] = {
      isa: 'XCConfigurationList',
      buildConfigurations: [
        { value: debugConfigUuid, comment: 'Debug' },
        { value: releaseConfigUuid, comment: 'Release' },
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: 'Release',
    };
    project.hash.project.objects['XCConfigurationList'][`${configListUuid}_comment`] =
      `Build configuration list for PBXNativeTarget "${NSE_TARGET_NAME}"`;

    // --- Native target ---
    const nativeTargetUuid = project.generateUuid();

    project.hash.project.objects['PBXNativeTarget'][nativeTargetUuid] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: configListUuid,
      buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${NSE_TARGET_NAME}"`,
      buildPhases: [
        { value: sourcesBuildPhaseUuid, comment: 'Sources' },
        { value: resourcesBuildPhaseUuid, comment: 'Resources' },
        { value: frameworksBuildPhaseUuid, comment: 'Frameworks' },
      ],
      buildRules: [],
      dependencies: [],
      name: NSE_TARGET_NAME,
      productName: NSE_TARGET_NAME,
      productReference: productFileRef,
      productReference_comment: `${NSE_TARGET_NAME}.appex`,
      productType: '"com.apple.product-type.app-extension"',
    };
    project.hash.project.objects['PBXNativeTarget'][`${nativeTargetUuid}_comment`] = NSE_TARGET_NAME;

    // --- Add target to project ---
    const projectSection = project.hash.project.objects['PBXProject'][project.hash.project.rootObject];
    if (projectSection && projectSection.targets) {
      projectSection.targets.push({
        value: nativeTargetUuid,
        comment: NSE_TARGET_NAME,
      });
    }

    // --- Add target dependency to main app (embed the extension) ---
    const containerItemProxyUuid = project.generateUuid();
    project.hash.project.objects['PBXContainerItemProxy'] = project.hash.project.objects['PBXContainerItemProxy'] || {};
    project.hash.project.objects['PBXContainerItemProxy'][containerItemProxyUuid] = {
      isa: 'PBXContainerItemProxy',
      containerPortal: project.hash.project.rootObject,
      containerPortal_comment: 'Project object',
      proxyType: 1,
      remoteGlobalIDString: nativeTargetUuid,
      remoteInfo: NSE_TARGET_NAME,
    };
    project.hash.project.objects['PBXContainerItemProxy'][`${containerItemProxyUuid}_comment`] = 'PBXContainerItemProxy';

    const targetDependencyUuid = project.generateUuid();
    project.hash.project.objects['PBXTargetDependency'] = project.hash.project.objects['PBXTargetDependency'] || {};
    project.hash.project.objects['PBXTargetDependency'][targetDependencyUuid] = {
      isa: 'PBXTargetDependency',
      target: nativeTargetUuid,
      target_comment: NSE_TARGET_NAME,
      targetProxy: containerItemProxyUuid,
      targetProxy_comment: 'PBXContainerItemProxy',
    };
    project.hash.project.objects['PBXTargetDependency'][`${targetDependencyUuid}_comment`] = 'PBXTargetDependency';

    // Add dependency to main Tahion target
    const mainTargetKey = Object.keys(project.hash.project.objects['PBXNativeTarget']).find(
      (key) => !key.endsWith('_comment') && project.hash.project.objects['PBXNativeTarget'][key].name === 'Tahion'
    );
    if (mainTargetKey) {
      project.hash.project.objects['PBXNativeTarget'][mainTargetKey].dependencies.push({
        value: targetDependencyUuid,
        comment: 'PBXTargetDependency',
      });
    }

    // --- Add to "Copy Files" (Embed App Extensions) build phase ---
    const nseBuildFileForEmbed = project.generateUuid();
    project.hash.project.objects['PBXBuildFile'][nseBuildFileForEmbed] = {
      isa: 'PBXBuildFile',
      fileRef: productFileRef,
      fileRef_comment: `${NSE_TARGET_NAME}.appex`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    project.hash.project.objects['PBXBuildFile'][`${nseBuildFileForEmbed}_comment`] = `${NSE_TARGET_NAME}.appex in Copy Files`;

    // Find existing "Copy Files" phase or create one
    const mainTarget = project.hash.project.objects['PBXNativeTarget'][mainTargetKey];
    let copyFilesPhaseFound = false;

    if (mainTarget && mainTarget.buildPhases) {
      for (const phase of mainTarget.buildPhases) {
        const phaseObj = project.hash.project.objects['PBXCopyFilesBuildPhase']?.[phase.value];
        if (phaseObj && phaseObj.dstSubfolderSpec === 13) {
          // dstSubfolderSpec 13 = Plug-Ins (app extensions)
          phaseObj.files.push({
            value: nseBuildFileForEmbed,
            comment: `${NSE_TARGET_NAME}.appex in Copy Files`,
          });
          copyFilesPhaseFound = true;
          break;
        }
      }
    }

    if (!copyFilesPhaseFound) {
      const copyFilesPhaseUuid = project.generateUuid();
      project.hash.project.objects['PBXCopyFilesBuildPhase'] = project.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
      project.hash.project.objects['PBXCopyFilesBuildPhase'][copyFilesPhaseUuid] = {
        isa: 'PBXCopyFilesBuildPhase',
        buildActionMask: 2147483647,
        dstPath: '""',
        dstSubfolderSpec: 13,
        files: [
          { value: nseBuildFileForEmbed, comment: `${NSE_TARGET_NAME}.appex in Copy Files` },
        ],
        name: '"Copy Files"',
        runOnlyForDeploymentPostprocessing: 0,
      };
      project.hash.project.objects['PBXCopyFilesBuildPhase'][`${copyFilesPhaseUuid}_comment`] = 'Copy Files';

      if (mainTarget && mainTarget.buildPhases) {
        mainTarget.buildPhases.push({
          value: copyFilesPhaseUuid,
          comment: 'Copy Files',
        });
      }
    }

    console.log(`[withNotificationServiceExtension] Added "${NSE_TARGET_NAME}" target (${nseBundleId})`);
    return config;
  });
};

/**
 * Updates build settings for an existing NSE target (called when target already exists).
 */
function updateBuildSettings(project, nseBundleId, buildNumber, version) {
  const targets = project.pbxNativeTargetSection();
  for (const key in targets) {
    const target = targets[key];
    if (target.name === 'NotificationServiceExtension') {
      const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
      if (!configList) continue;

      for (const configRef of configList.buildConfigurations) {
        const buildConfig = project.pbxXCBuildConfigurationSection()[configRef.value];
        if (!buildConfig || !buildConfig.buildSettings) continue;

        buildConfig.buildSettings.DEVELOPMENT_TEAM = TEAM_ID;
        buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
        buildConfig.buildSettings.MARKETING_VERSION = version;
      }

      console.log(`[withNotificationServiceExtension] Updated: DEVELOPMENT_TEAM=${TEAM_ID}, VERSION=${version}, BUILD=${buildNumber}`);
      break;
    }
  }
}

module.exports = withNotificationServiceExtension;
