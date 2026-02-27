import UserNotifications
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
            intent.setImage(avatar, forParameterNamed: \.sender)
        }

        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming

        interaction.donate { error in
            if let error = error {
                NSLog("NotificationServiceExtension: Failed to donate interaction: \(error)")
            }

            do {
                let updatedContent = try content.updating(from: intent)
                contentHandler(updatedContent)
            } catch {
                NSLog("NotificationServiceExtension: Failed to update content: \(error)")
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
                NSLog("NotificationServiceExtension: Failed to download avatar: \(error?.localizedDescription ?? "unknown")")
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
                NSLog("NotificationServiceExtension: Failed to save avatar to temp: \(error)")
                completion(data, nil)
            }
        }
        task.resume()
    }
}
