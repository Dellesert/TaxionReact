const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Config plugin to add Firebase push notification delegates to AppDelegate.
 * Adds:
 * - UNUserNotificationCenter.current().delegate = self
 * - Messaging.messaging().delegate = self
 * - application.registerForRemoteNotifications()
 * - UNUserNotificationCenterDelegate extension
 * - MessagingDelegate extension
 * - didRegisterForRemoteNotificationsWithDeviceToken handler
 */
const withPushNotificationDelegates = (config) => {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Add imports if missing
    if (!contents.includes('import UserNotifications')) {
      contents = contents.replace(
        'import Expo',
        'import Expo\nimport UserNotifications'
      );
    }
    if (!contents.includes('import FirebaseMessaging')) {
      contents = contents.replace(
        'import FirebaseCore',
        'import FirebaseCore\nimport FirebaseMessaging'
      );
    }

    // 2. Add delegate setup and registerForRemoteNotifications in didFinishLaunchingWithOptions
    if (!contents.includes('UNUserNotificationCenter.current().delegate = self')) {
      contents = contents.replace(
        /FirebaseApp\.configure\(\)\n(\/\/ @generated end @react-native-firebase\/app-didFinishLaunchingWithOptions)/,
        `FirebaseApp.configure()\n$1\n    // Push notification delegates\n    UNUserNotificationCenter.current().delegate = self\n    Messaging.messaging().delegate = self\n    application.registerForRemoteNotifications()`
      );
    }

    // 3. Add didRegisterForRemoteNotificationsWithDeviceToken if missing
    if (!contents.includes('didRegisterForRemoteNotificationsWithDeviceToken')) {
      contents = contents.replace(
        /^(\s*\/\/ Universal Links)/m,
        `  // MARK: - Remote Notifications Token

  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
  }

  public override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("Failed to register for remote notifications: \\(error.localizedDescription)")
  }

  $1`
      );
    }

    // 4. Add UNUserNotificationCenterDelegate extension if missing
    if (!contents.includes('UNUserNotificationCenterDelegate')) {
      contents += `

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([[.banner, .sound, .badge]])
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}
`;
    }

    // 5. Add MessagingDelegate extension if missing
    if (!contents.includes('MessagingDelegate')) {
      contents += `
// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
  public func messaging(
    _ messaging: Messaging,
    didReceiveRegistrationToken fcmToken: String?
  ) {
    if let fcmToken = fcmToken {
      print("FCM Token: \\(fcmToken)")
    }
  }
}
`;
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withPushNotificationDelegates;
