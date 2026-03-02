import UserNotifications
import UIKit
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

    let userInfo = bestAttemptContent.userInfo
    let senderName = userInfo["sender_name"] as? String ?? ""
    let avatarURLString = userInfo["sender_avatar"] as? String
    let attachmentURLString = userInfo["attachment_url"] as? String

    let group = DispatchGroup()
    var avatarData: Data? = nil
    var attachmentFileURL: URL? = nil

    // Download sender avatar (for left side communication notification)
    if let urlString = avatarURLString, let avatarURL = URL(string: urlString) {
      group.enter()
      downloadAvatar(url: avatarURL) { data in
        avatarData = data
        group.leave()
      }
    }

    // Download attachment thumbnail (for right side preview)
    if let urlString = attachmentURLString, let url = URL(string: urlString) {
      group.enter()
      downloadAttachment(url: url) { fileURL in
        attachmentFileURL = fileURL
        group.leave()
      }
    }

    group.notify(queue: .main) {
      // Attach media preview (right side thumbnail)
      if let fileURL = attachmentFileURL {
        if let attachment = try? UNNotificationAttachment(
          identifier: "media",
          url: fileURL,
          options: [UNNotificationAttachmentOptionsThumbnailHiddenKey: false]
        ) {
          bestAttemptContent.attachments = [attachment]
        }
      }

      // Apply communication notification (left side avatar)
      let updated = self.applyCommNotification(
        to: bestAttemptContent,
        senderName: senderName,
        avatarData: avatarData
      )
      contentHandler(updated)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  // MARK: - Communication Notification (avatar on the left)

  private func applyCommNotification(
    to content: UNMutableNotificationContent,
    senderName: String,
    avatarData: Data?
  ) -> UNNotificationContent {
    var personImage: INImage? = nil
    if let data = avatarData {
      personImage = INImage(imageData: data)
    }

    let handle = INPersonHandle(value: nil, type: .unknown)
    let sender = INPerson(
      personHandle: handle,
      nameComponents: nil,
      displayName: senderName,
      image: personImage,
      contactIdentifier: nil,
      customIdentifier: nil
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

    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate(completion: nil)

    do {
      let updated = try content.updating(from: intent)
      return updated
    } catch {
      return content
    }
  }

  // MARK: - Avatar Download

  private func downloadAvatar(
    url: URL,
    completion: @escaping (Data?) -> Void
  ) {
    let task = URLSession.shared.dataTask(with: url) { data, _, error in
      guard error == nil, let data = data else {
        completion(nil)
        return
      }
      guard let originalImage = UIImage(data: data) else {
        completion(nil)
        return
      }
      let circularImage = self.makeCircularImage(originalImage)
      completion(circularImage.pngData())
    }
    task.resume()
  }

  // MARK: - Attachment Download (for right side preview)

  private func downloadAttachment(
    url: URL,
    completion: @escaping (URL?) -> Void
  ) {
    let task = URLSession.shared.dataTask(with: url) { data, response, error in
      guard error == nil, let data = data, !data.isEmpty else {
        completion(nil)
        return
      }

      // Determine file extension from MIME type or URL
      var fileExtension = "jpg"
      if let mimeType = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Type") {
        if mimeType.contains("png") {
          fileExtension = "png"
        } else if mimeType.contains("gif") {
          fileExtension = "gif"
        } else if mimeType.contains("mp4") || mimeType.contains("video") {
          fileExtension = "mp4"
        }
      }

      // Write to temp file (UNNotificationAttachment requires a file URL)
      let tempDir = FileManager.default.temporaryDirectory
      let fileName = UUID().uuidString + "." + fileExtension
      let fileURL = tempDir.appendingPathComponent(fileName)

      do {
        try data.write(to: fileURL)
        completion(fileURL)
      } catch {
        completion(nil)
      }
    }
    task.resume()
  }

  private func makeCircularImage(_ image: UIImage) -> UIImage {
    let size: CGFloat = 300
    let rect = CGRect(x: 0, y: 0, width: size, height: size)

    let renderer = UIGraphicsImageRenderer(size: rect.size)
    return renderer.image { _ in
      UIBezierPath(ovalIn: rect).addClip()
      image.draw(in: rect)
    }
  }
}
