const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TEAM_ID = 'QNVQ55232N';
const NSE_TARGET_NAME = 'NotificationServiceExtension';
const NSE_BUNDLE_ID_SUFFIX = '.NotificationServiceExtension';

// --- Inline file contents (created during prebuild) ---

const NOTIFICATION_SERVICE_SWIFT = `import UserNotifications

class NotificationService: UNNotificationServiceExtension {

  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    guard let bestAttemptContent = bestAttemptContent else {
      contentHandler(request.content)
      return
    }

    // Get avatar URL from the custom APNS payload
    let userInfo = bestAttemptContent.userInfo
    guard let avatarURLString = userInfo["sender_avatar"] as? String,
          let avatarURL = URL(string: avatarURLString) else {
      contentHandler(bestAttemptContent)
      return
    }

    downloadAndAttachAvatar(url: avatarURL) { attachment in
      if let attachment = attachment {
        bestAttemptContent.attachments = [attachment]
      }
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  // MARK: - Avatar Download & Circular Crop

  private func downloadAndAttachAvatar(
    url: URL,
    completion: @escaping (UNNotificationAttachment?) -> Void
  ) {
    let task = URLSession.shared.dataTask(with: url) { data, response, error in
      guard error == nil,
            let data = data,
            let originalImage = UIImage(data: data) else {
        completion(nil)
        return
      }

      let circularImage = self.makeCircularImage(originalImage)

      let fileManager = FileManager.default
      let tmpDir = fileManager.temporaryDirectory
      let fileName = UUID().uuidString + ".png"
      let fileURL = tmpDir.appendingPathComponent(fileName)

      guard let pngData = circularImage.pngData() else {
        completion(nil)
        return
      }

      do {
        try pngData.write(to: fileURL)
        let attachment = try UNNotificationAttachment(
          identifier: "avatar",
          url: fileURL,
          options: [UNNotificationAttachmentOptionsTypeHintKey: "public.png"]
        )
        completion(attachment)
      } catch {
        completion(nil)
      }
    }
    task.resume()
  }

  private func makeCircularImage(_ image: UIImage) -> UIImage {
    let size: CGFloat = 100
    let rect = CGRect(x: 0, y: 0, width: size, height: size)

    let renderer = UIGraphicsImageRenderer(size: rect.size)
    return renderer.image { _ in
      UIBezierPath(ovalIn: rect).addClip()
      image.draw(in: rect)
    }
  }
}
`;

const NOTIFICATION_SERVICE_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleDisplayName</key>
    <string>NotificationServiceExtension</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
      <key>NSExtensionPointIdentifier</key>
      <string>com.apple.usernotifications.service</string>
      <key>NSExtensionPrincipalClass</key>
      <string>$(PRODUCT_MODULE_NAME).NotificationService</string>
    </dict>
  </dict>
</plist>
`;

/**
 * Config plugin to add a Notification Service Extension (NSE) target to the Xcode project.
 *
 * The NSE intercepts push notifications with mutable-content=1,
 * downloads the sender avatar, crops it to a circle,
 * and attaches it to the notification for rich display on iOS.
 *
 * Files are created automatically during prebuild.
 */
const withNotificationServiceExtension = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const platformRoot = config.modRequest.platformProjectRoot;
    const bundleIdentifier = config.ios?.bundleIdentifier || 'com.dellesert.tachyon-messenger';
    const nseBundleId = bundleIdentifier + NSE_BUNDLE_ID_SUFFIX;
    const buildNumber = config.ios?.buildNumber || '1';
    const version = config.version || '1.0.0';

    // --- 1. Create files on disk ---
    const nseDir = path.join(platformRoot, NSE_TARGET_NAME);
    if (!fs.existsSync(nseDir)) {
      fs.mkdirSync(nseDir, { recursive: true });
    }
    fs.writeFileSync(path.join(nseDir, 'NotificationService.swift'), NOTIFICATION_SERVICE_SWIFT);
    fs.writeFileSync(path.join(nseDir, `${NSE_TARGET_NAME}-Info.plist`), NOTIFICATION_SERVICE_INFO_PLIST);
    console.log(`[withNotificationServiceExtension] Created files in ${nseDir}`);

    // --- 2. Check if the target already exists (idempotent) ---
    const targets = project.pbxNativeTargetSection();
    for (const key in targets) {
      if (targets[key].name === NSE_TARGET_NAME) {
        console.log(`[withNotificationServiceExtension] Target already exists, updating build settings.`);
        updateBuildSettings(project, nseBundleId, buildNumber, version);
        return config;
      }
    }

    // --- 3. Find the main app target dynamically ---
    const mainTargetKey = Object.keys(targets).find(
      (key) =>
        !key.endsWith('_comment') &&
        targets[key].productType === '"com.apple.product-type.application"'
    );
    const mainTargetName = mainTargetKey ? targets[mainTargetKey].name : 'Tahion';

    // --- 4. Add file references ---
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

    const plistFileRef = project.generateUuid();
    project.hash.project.objects['PBXFileReference'][plistFileRef] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.xml',
      name: `${NSE_TARGET_NAME}-Info.plist`,
      path: `${NSE_TARGET_NAME}-Info.plist`,
      sourceTree: '"<group>"',
    };
    project.hash.project.objects['PBXFileReference'][`${plistFileRef}_comment`] = `${NSE_TARGET_NAME}-Info.plist`;

    // --- 5. Add PBXGroup ---
    const groupUuid = project.generateUuid();
    project.hash.project.objects['PBXGroup'][groupUuid] = {
      isa: 'PBXGroup',
      children: [
        { value: swiftFileRef, comment: 'NotificationService.swift' },
        { value: plistFileRef, comment: `${NSE_TARGET_NAME}-Info.plist` },
      ],
      name: NSE_TARGET_NAME,
      path: NSE_TARGET_NAME,
      sourceTree: '"<group>"',
    };
    project.hash.project.objects['PBXGroup'][`${groupUuid}_comment`] = NSE_TARGET_NAME;

    // Add group to main group
    const mainGroup = project.hash.project.objects['PBXGroup'][project.getFirstProject().firstProject.mainGroup];
    if (mainGroup && mainGroup.children) {
      mainGroup.children.push({
        value: groupUuid,
        comment: NSE_TARGET_NAME,
      });
    }

    // --- 6. Product reference ---
    const productFileRef = project.generateUuid();
    project.hash.project.objects['PBXFileReference'][productFileRef] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${NSE_TARGET_NAME}.appex`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    };
    project.hash.project.objects['PBXFileReference'][`${productFileRef}_comment`] = `${NSE_TARGET_NAME}.appex`;

    const productsGroupKey = Object.keys(project.hash.project.objects['PBXGroup']).find(
      (key) => !key.endsWith('_comment') && project.hash.project.objects['PBXGroup'][key].name === 'Products'
    );
    if (productsGroupKey) {
      project.hash.project.objects['PBXGroup'][productsGroupKey].children.push({
        value: productFileRef,
        comment: `${NSE_TARGET_NAME}.appex`,
      });
    }

    // --- 7. Build phases ---
    const sourcesBuildPhaseUuid = project.generateUuid();
    project.hash.project.objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [{ value: swiftBuildFileRef, comment: 'NotificationService.swift in Sources' }],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXSourcesBuildPhase'][`${sourcesBuildPhaseUuid}_comment`] = 'Sources';

    const frameworksBuildPhaseUuid = project.generateUuid();
    project.hash.project.objects['PBXFrameworksBuildPhase'][frameworksBuildPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXFrameworksBuildPhase'][`${frameworksBuildPhaseUuid}_comment`] = 'Frameworks';

    const resourcesBuildPhaseUuid = project.generateUuid();
    project.hash.project.objects['PBXResourcesBuildPhase'] = project.hash.project.objects['PBXResourcesBuildPhase'] || {};
    project.hash.project.objects['PBXResourcesBuildPhase'][resourcesBuildPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects['PBXResourcesBuildPhase'][`${resourcesBuildPhaseUuid}_comment`] = 'Resources';

    // --- 8. Build configurations ---
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

    // --- 9. Native target ---
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

    // --- 10. Add target to project ---
    const projectSection = project.hash.project.objects['PBXProject'][project.hash.project.rootObject];
    if (projectSection && projectSection.targets) {
      projectSection.targets.push({
        value: nativeTargetUuid,
        comment: NSE_TARGET_NAME,
      });
    }

    // --- 11. Target dependency & embed ---
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

    // Add dependency to main app target
    if (mainTargetKey) {
      targets[mainTargetKey].dependencies.push({
        value: targetDependencyUuid,
        comment: 'PBXTargetDependency',
      });
    }

    // Embed extension in Copy Files phase
    const nseBuildFileForEmbed = project.generateUuid();
    project.hash.project.objects['PBXBuildFile'][nseBuildFileForEmbed] = {
      isa: 'PBXBuildFile',
      fileRef: productFileRef,
      fileRef_comment: `${NSE_TARGET_NAME}.appex`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    };
    project.hash.project.objects['PBXBuildFile'][`${nseBuildFileForEmbed}_comment`] = `${NSE_TARGET_NAME}.appex in Copy Files`;

    const mainTarget = targets[mainTargetKey];
    let copyFilesPhaseFound = false;

    if (mainTarget && mainTarget.buildPhases) {
      for (const phase of mainTarget.buildPhases) {
        const phaseObj = project.hash.project.objects['PBXCopyFilesBuildPhase']?.[phase.value];
        if (phaseObj && phaseObj.dstSubfolderSpec === 13) {
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
        files: [{ value: nseBuildFileForEmbed, comment: `${NSE_TARGET_NAME}.appex in Copy Files` }],
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

    console.log(`[withNotificationServiceExtension] Added "${NSE_TARGET_NAME}" target (${nseBundleId}) to "${mainTargetName}"`);
    return config;
  });
};

function updateBuildSettings(project, nseBundleId, buildNumber, version) {
  const targets = project.pbxNativeTargetSection();
  for (const key in targets) {
    const target = targets[key];
    if (target.name === NSE_TARGET_NAME) {
      const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
      if (!configList) continue;

      for (const configRef of configList.buildConfigurations) {
        const buildConfig = project.pbxXCBuildConfigurationSection()[configRef.value];
        if (!buildConfig || !buildConfig.buildSettings) continue;

        buildConfig.buildSettings.DEVELOPMENT_TEAM = TEAM_ID;
        buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
        buildConfig.buildSettings.MARKETING_VERSION = version;
      }

      console.log(`[withNotificationServiceExtension] Updated: TEAM=${TEAM_ID}, VERSION=${version}, BUILD=${buildNumber}`);
      break;
    }
  }
}

module.exports = withNotificationServiceExtension;
