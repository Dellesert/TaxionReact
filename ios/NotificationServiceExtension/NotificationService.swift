import UserNotifications

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
    // Deliver whatever we have before the time limit
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

      // Crop to circle
      let circularImage = self.makeCircularImage(originalImage)

      // Write to temp file
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
