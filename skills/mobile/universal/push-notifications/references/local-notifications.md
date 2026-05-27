# Local Notifications

## Local Notification Scheduling

```swift
import UserNotifications

class LocalNotificationScheduler {
    static func scheduleReminder(title: String, body: String, date: Date, identifier: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let dateComponents = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: date
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    static func scheduleRecurring(
        title: String,
        body: String,
        weekday: Int,
        hour: Int,
        minute: Int,
        identifier: String
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.weekday = weekday
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    static func cancelNotification(identifier: String) {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [identifier])
    }

    static func cancelAll() {
        UNUserNotificationCenter.current()
            .removeAllPendingNotificationRequests()
    }

    static func getPendingNotifications() async -> [UNNotificationRequest] {
        return await UNUserNotificationCenter.current()
            .pendingNotificationRequests()
    }
}
```

## Notification Content Extensions

```swift
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {
    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var actionButton: UIButton!

    func didReceive(_ notification: UNNotification) {
        let content = notification.request.content

        if let imageURL = content.userInfo["image_url"] as? String,
           let url = URL(string: imageURL) {
            loadImage(from: url)
        }

        if let actionTitle = content.userInfo["action_title"] as? String {
            actionButton.setTitle(actionTitle, for: .normal)
        }

        titleLabel.text = content.title
        bodyLabel.text = content.body
    }

    func didReceive(_ response: UNNotificationResponse,
                    completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {
        if response.actionIdentifier == "CUSTOM_ACTION" {
            actionButton.isHidden = true
            completion(.dismissAndForwardAction)
        } else {
            completion(.dismiss)
        }
    }
}

// Notification Service Extension
class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest,
                            withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent else { return }

        if let mediaURL = request.content.userInfo["media-url"] as? String,
           let url = URL(string: mediaURL) {
            downloadAndAttachMedia(from: url, content: bestAttemptContent) {
                contentHandler(bestAttemptContent)
            }
        } else {
            contentHandler(bestAttemptContent)
        }
    }

    private func downloadAndAttachMedia(from url: URL, content: UNMutableNotificationContent,
                                       completion: @escaping () -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { localURL, _, _ in
            guard let localURL else { completion(); return }

            let attachment = try? UNNotificationAttachment(
                identifier: "media",
                url: localURL,
                options: nil
            )

            if let attachment {
                content.attachments = [attachment]
            }

            completion()
        }
        task.resume()
    }
}
```

## Key Points

- Schedule local notifications for reminders and alerts
- Use calendar triggers for date-based notifications
- Use time interval triggers for delayed notifications
- Support recurring notifications with weekly patterns
- Use notification content extensions for rich media
- Use service extensions for content modification
- Cancel pending notifications when no longer needed
- Handle notification grouping with thread identifiers
- Support notification dismissal tracking
- Implement notification settings UI
- Test notification timing across time zones
- Monitor notification delivery and engagement
