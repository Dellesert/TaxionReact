const { withXcodeProject, withDangerousMod, withPlugins, withEntitlementsPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist');

const TEAM_ID = 'QNVQ55232N';
const EXTENSION_NAME = 'NotificationServiceExtension';
const EXTENSION_BUNDLE_ID_SUFFIX = '.notification-service';

// MARK: - Swift source code for NotificationService

const NOTIFICATION_SERVICE_SWIFT = `import UserNotifications
import Intents

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

        let userInfo = request.content.userInfo

        // Get sender avatar URL from custom APNS payload
        guard let avatarURLString = userInfo["sender_avatar"] as? String,
              let avatarURL = URL(string: avatarURLString) else {
            contentHandler(bestAttemptContent)
            return
        }

        let senderName = userInfo["sender_name"] as? String

        // Download avatar image
        downloadImage(from: avatarURL) { [weak self] imageData, fileURL in
            guard let self = self else {
                contentHandler(bestAttemptContent)
                return
            }

            // Attach image to notification
            if let fileURL = fileURL {
                if let attachment = try? UNNotificationAttachment(
                    identifier: "avatar",
                    url: fileURL,
                    options: [UNNotificationAttachmentOptionsTypeHintKey: "public.jpeg"]
                ) {
                    bestAttemptContent.attachments = [attachment]
                }
            }

            // iOS 15+: Use Communication Notification for Telegram-like avatar display
            if #available(iOS 15.0, *), let senderName = senderName {
                self.configureCommunicationNotification(
                    content: bestAttemptContent,
                    senderName: senderName,
                    avatarData: imageData,
                    contentHandler: contentHandler
                )
            } else {
                contentHandler(bestAttemptContent)
            }
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Deliver the best attempt content before timeout
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    // MARK: - Communication Notification (iOS 15+)

    @available(iOS 15.0, *)
    private func configureCommunicationNotification(
        content: UNMutableNotificationContent,
        senderName: String,
        avatarData: Data?,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        let handle = INPersonHandle(value: senderName, type: .unknown)

        var avatar: INImage? = nil
        if let data = avatarData {
            avatar = INImage(imageData: data)
        }

        let sender = INPerson(
            personHandle: handle,
            nameComponents: nil,
            displayName: senderName,
            image: avatar,
            contactIdentifier: nil,
            customIdentifier: senderName
        )

        let intent = INSendMessageIntent(
            recipients: nil,
            outgoingMessageType: .outgoingMessageText,
            content: content.body,
            speakableGroupName: nil,
            conversationIdentifier: content.threadIdentifier,
            serviceName: nil,
            sender: sender,
            attachments: nil
        )

        if let avatar = avatar {
            intent.setImage(avatar, forParameterNamed: \\.sender)
        }

        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming

        interaction.donate { error in
            if let error = error {
                NSLog("NotificationServiceExtension: Failed to donate interaction: \\(error)")
            }

            do {
                let updatedContent = try content.updating(from: intent)
                contentHandler(updatedContent)
            } catch {
                NSLog("NotificationServiceExtension: Failed to update content: \\(error)")
                contentHandler(content)
            }
        }
    }

    // MARK: - Image Download

    private func downloadImage(
        from url: URL,
        completion: @escaping (Data?, URL?) -> Void
    ) {
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                NSLog("NotificationServiceExtension: Failed to download avatar: \\(error?.localizedDescription ?? \\"unknown\\")")
                completion(nil, nil)
                return
            }

            // Save to temp file for UNNotificationAttachment
            let tempDir = FileManager.default.temporaryDirectory
            let fileURL = tempDir.appendingPathComponent(UUID().uuidString + ".jpg")

            do {
                try data.write(to: fileURL)
                completion(data, fileURL)
            } catch {
                NSLog("NotificationServiceExtension: Failed to save avatar to temp: \\(error)")
                completion(data, nil)
            }
        }
        task.resume()
    }
}
`;

// MARK: - Plugin: Write extension source files

const withNotificationServiceFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const extensionDir = path.join(projectRoot, EXTENSION_NAME);

      // Create extension directory
      fs.mkdirSync(extensionDir, { recursive: true });

      // Write NotificationService.swift
      const swiftPath = path.join(extensionDir, 'NotificationService.swift');
      fs.writeFileSync(swiftPath, NOTIFICATION_SERVICE_SWIFT);
      console.log(`✅ [iOS] Created ${EXTENSION_NAME}/NotificationService.swift`);

      // Write Info.plist
      const bundleId = config.ios?.bundleIdentifier || 'com.dellesert.tachyon-messenger';
      const version = config.version || '1.0.0';
      const buildNumber = config.ios?.buildNumber || '1';

      const infoPlist = {
        CFBundleName: '$(PRODUCT_NAME)',
        CFBundleDisplayName: EXTENSION_NAME,
        CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
        CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
        CFBundleExecutable: '$(EXECUTABLE_NAME)',
        CFBundleInfoDictionaryVersion: '6.0',
        CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
        CFBundleShortVersionString: '$(MARKETING_VERSION)',
        CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
        NSExtension: {
          NSExtensionPointIdentifier: 'com.apple.usernotifications.service',
          NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).NotificationService',
        },
      };

      const infoPlistPath = path.join(extensionDir, `${EXTENSION_NAME}-Info.plist`);
      fs.writeFileSync(infoPlistPath, plist.default.build(infoPlist));
      console.log(`✅ [iOS] Created ${EXTENSION_NAME}/${EXTENSION_NAME}-Info.plist`);

      // Write entitlements
      const entitlements = {
        'com.apple.security.application-groups': [
          'group.com.dellesert.tachyon-messenger',
        ],
      };

      const entitlementsPath = path.join(extensionDir, `${EXTENSION_NAME}.entitlements`);
      fs.writeFileSync(entitlementsPath, plist.default.build(entitlements));
      console.log(`✅ [iOS] Created ${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`);

      return config;
    },
  ]);
};

// MARK: - Plugin: Add extension target to Xcode project

const withNotificationServiceTarget = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const bundleId = config.ios?.bundleIdentifier || 'com.dellesert.tachyon-messenger';
    const extensionBundleId = bundleId + EXTENSION_BUNDLE_ID_SUFFIX;
    const version = config.version || '1.0.0';
    const buildNumber = config.ios?.buildNumber || '1';
    const deploymentTarget = '15.1';

    // Check if target already exists
    const targets = project.pbxNativeTargetSection();
    for (const key in targets) {
      if (targets[key].name === EXTENSION_NAME) {
        console.log(`ℹ️  [iOS] ${EXTENSION_NAME} target already exists, updating settings`);
        updateTargetSettings(project, targets[key], extensionBundleId, version, buildNumber, deploymentTarget);
        return config;
      }
    }

    // Add the extension target
    const target = project.addTarget(
      EXTENSION_NAME,
      'app_extension',
      EXTENSION_NAME,
      extensionBundleId
    );

    if (!target) {
      console.error(`❌ [iOS] Failed to create ${EXTENSION_NAME} target`);
      return config;
    }

    // Add source file to build phase
    project.addBuildPhase(
      ['NotificationService.swift'],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid,
      'app_extension',
      `"${EXTENSION_NAME}"`
    );

    // Add resources build phase
    project.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid,
      'app_extension',
      `"${EXTENSION_NAME}"`
    );

    // Add frameworks build phase
    project.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      target.uuid,
      'app_extension',
      `"${EXTENSION_NAME}"`
    );

    // Configure build settings for the target
    const configList = project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
    if (configList) {
      for (const configRef of configList.buildConfigurations) {
        const buildConfig = project.pbxXCBuildConfigurationSection()[configRef.value];
        if (!buildConfig || !buildConfig.buildSettings) continue;

        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
        buildConfig.buildSettings.DEVELOPMENT_TEAM = TEAM_ID;
        buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
        buildConfig.buildSettings.MARKETING_VERSION = version;
        buildConfig.buildSettings.SWIFT_VERSION = '5.0';
        buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
        buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
        buildConfig.buildSettings.INFOPLIST_FILE = `"${EXTENSION_NAME}/${EXTENSION_NAME}-Info.plist"`;
        buildConfig.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements"`;
        buildConfig.buildSettings.CODE_SIGN_STYLE = 'Automatic';
        buildConfig.buildSettings.GENERATE_INFOPLIST_FILE = 'YES';
        buildConfig.buildSettings.CLANG_ANALYZER_NONNULL = 'YES';
        buildConfig.buildSettings.CLANG_ENABLE_MODULES = 'YES';
        buildConfig.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'YES';
      }
    }

    // Add dependency from main app to extension
    const mainTargetKey = project.getFirstTarget().uuid;
    project.addTargetDependency(mainTargetKey, [target.uuid]);

    // Add extension to "Copy Files" build phase (embed app extensions)
    const mainTarget = project.getFirstTarget().firstTarget;
    project.addBuildPhase(
      [`${EXTENSION_NAME}.appex`],
      'PBXCopyFilesBuildPhase',
      'Embed Foundation Extensions',
      mainTarget.uuid,
      'app_extension'
    );

    console.log(`✅ [iOS] Created ${EXTENSION_NAME} target in Xcode project`);

    return config;
  });
};

/**
 * Update existing target settings (when target already exists)
 */
function updateTargetSettings(project, target, extensionBundleId, version, buildNumber, deploymentTarget) {
  const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
  if (!configList) return;

  for (const configRef of configList.buildConfigurations) {
    const buildConfig = project.pbxXCBuildConfigurationSection()[configRef.value];
    if (!buildConfig || !buildConfig.buildSettings) continue;

    buildConfig.buildSettings.DEVELOPMENT_TEAM = TEAM_ID;
    buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
    buildConfig.buildSettings.MARKETING_VERSION = version;
    buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
    buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
  }
}

// MARK: - Plugin: Modify Podfile for extension target

const withNotificationServicePodfile = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.log('ℹ️  [iOS] Podfile does not exist yet');
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Check if already modified
      if (contents.includes(`target '${EXTENSION_NAME}'`)) {
        console.log(`ℹ️  [iOS] ${EXTENSION_NAME} Podfile target already exists`);
        return config;
      }

      // Add extension target before the end of the file
      // Place it after the main target's `end` but within the Podfile
      const extensionTarget = `
target '${EXTENSION_NAME}' do
  use_frameworks! :linkage => :static
  pod 'Firebase/Messaging'
end
`;

      // Find the main target's closing `end` and add after it
      const mainTargetEndRegex = /(target 'Tahion' do[\s\S]*?^end)/m;
      if (mainTargetEndRegex.test(contents)) {
        contents = contents.replace(mainTargetEndRegex, `$1\n${extensionTarget}`);
        fs.writeFileSync(podfilePath, contents);
        console.log(`✅ [iOS] Added ${EXTENSION_NAME} target to Podfile`);
      } else {
        // Fallback: append to end
        contents += '\n' + extensionTarget;
        fs.writeFileSync(podfilePath, contents);
        console.log(`✅ [iOS] Appended ${EXTENSION_NAME} target to Podfile`);
      }

      return config;
    },
  ]);
};

// MARK: - Combined plugin

const withNotificationServiceExtension = (config) => {
  return withPlugins(config, [
    withNotificationServiceFiles,
    withNotificationServiceTarget,
    withNotificationServicePodfile,
  ]);
};

module.exports = withNotificationServiceExtension;
