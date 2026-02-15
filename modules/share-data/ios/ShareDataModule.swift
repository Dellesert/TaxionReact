import ExpoModulesCore

public class ShareDataModule: Module {
  private let appGroup = "group.com.dellesert.tachyon-messenger"

  public func definition() -> ModuleDefinition {
    Name("ShareData")

    Function("syncChats") { (chatsJson: String) in
      let defaults = UserDefaults(suiteName: self.appGroup)
      defaults?.set(chatsJson, forKey: "shareExtension_chats")
      defaults?.synchronize()
    }

    Function("syncAuth") { (sessionId: String, userId: Int, apiBaseUrl: String) in
      let defaults = UserDefaults(suiteName: self.appGroup)
      defaults?.set(sessionId, forKey: "shareExtension_sessionId")
      defaults?.set(userId, forKey: "shareExtension_userId")
      defaults?.set(apiBaseUrl, forKey: "shareExtension_apiBaseUrl")
      defaults?.synchronize()
    }

    Function("clearSyncedData") {
      let defaults = UserDefaults(suiteName: self.appGroup)
      defaults?.removeObject(forKey: "shareExtension_chats")
      defaults?.removeObject(forKey: "shareExtension_sessionId")
      defaults?.removeObject(forKey: "shareExtension_userId")
      defaults?.removeObject(forKey: "shareExtension_apiBaseUrl")
      defaults?.synchronize()
    }
  }
}
