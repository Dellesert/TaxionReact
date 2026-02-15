import ExpoModulesCore

public class ShareDataModule: Module {
  private var appGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String
  }

  public func definition() -> ModuleDefinition {
    Name("ShareData")

    Function("syncChats") { (chatsJson: String) in
      guard let group = self.appGroup else {
        NSLog("[ShareData] ERROR: AppGroupIdentifier not found in Info.plist — syncChats skipped")
        return
      }
      guard let defaults = UserDefaults(suiteName: group) else {
        NSLog("[ShareData] ERROR: Cannot create UserDefaults for suiteName=%@ — App Group may not be configured in Apple Developer Portal", group)
        return
      }
      defaults.set(chatsJson, forKey: "shareExtension_chats")
      defaults.synchronize()
      let count = (try? JSONSerialization.jsonObject(with: chatsJson.data(using: .utf8) ?? Data()) as? [[String: Any]])?.count ?? 0
      NSLog("[ShareData] syncChats OK — %d chats synced to group=%@", count, group)
    }

    Function("syncAuth") { (sessionId: String, userId: Int, apiBaseUrl: String) in
      guard let group = self.appGroup else {
        NSLog("[ShareData] ERROR: AppGroupIdentifier not found in Info.plist — syncAuth skipped")
        return
      }
      guard let defaults = UserDefaults(suiteName: group) else {
        NSLog("[ShareData] ERROR: Cannot create UserDefaults for suiteName=%@ — App Group may not be configured in Apple Developer Portal", group)
        return
      }
      defaults.set(sessionId, forKey: "shareExtension_sessionId")
      defaults.set(userId, forKey: "shareExtension_userId")
      defaults.set(apiBaseUrl, forKey: "shareExtension_apiBaseUrl")
      defaults.synchronize()
      NSLog("[ShareData] syncAuth OK — group=%@, userId=%d, apiBaseUrl=%@", group, userId, apiBaseUrl)
    }

    Function("clearSyncedData") {
      guard let group = self.appGroup else {
        NSLog("[ShareData] clearSyncedData skipped — no AppGroupIdentifier")
        return
      }
      let defaults = UserDefaults(suiteName: group)
      defaults?.removeObject(forKey: "shareExtension_chats")
      defaults?.removeObject(forKey: "shareExtension_sessionId")
      defaults?.removeObject(forKey: "shareExtension_userId")
      defaults?.removeObject(forKey: "shareExtension_apiBaseUrl")
      defaults?.synchronize()
      NSLog("[ShareData] clearSyncedData OK — group=%@", group)
    }
  }
}
