import ExpoModulesCore

public class ShareDataModule: Module {
  private var appGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String
  }

  public func definition() -> ModuleDefinition {
    Name("ShareData")

    Function("syncChats") { (chatsJson: String) in
      guard let group = self.appGroup else { return }
      let defaults = UserDefaults(suiteName: group)
      defaults?.set(chatsJson, forKey: "shareExtension_chats")
      defaults?.synchronize()
    }

    Function("syncAuth") { (sessionId: String, userId: Int, apiBaseUrl: String) in
      guard let group = self.appGroup else { return }
      let defaults = UserDefaults(suiteName: group)
      defaults?.set(sessionId, forKey: "shareExtension_sessionId")
      defaults?.set(userId, forKey: "shareExtension_userId")
      defaults?.set(apiBaseUrl, forKey: "shareExtension_apiBaseUrl")
      defaults?.synchronize()
    }

    Function("clearSyncedData") {
      guard let group = self.appGroup else { return }
      let defaults = UserDefaults(suiteName: group)
      defaults?.removeObject(forKey: "shareExtension_chats")
      defaults?.removeObject(forKey: "shareExtension_sessionId")
      defaults?.removeObject(forKey: "shareExtension_userId")
      defaults?.removeObject(forKey: "shareExtension_apiBaseUrl")
      defaults?.synchronize()
    }
  }
}
