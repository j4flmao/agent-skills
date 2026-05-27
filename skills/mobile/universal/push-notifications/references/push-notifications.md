# Push Notifications Setup

## APNs Configuration

```swift
import UserNotifications

class PushNotificationManager: NSObject {
    static let shared = PushNotificationManager()
    private let notificationCenter = UNUserNotificationCenter.current()

    override private init() {
        super.init()
        notificationCenter.delegate = self
    }

    func requestAuthorization() async throws -> Bool {
        return try await notificationCenter.requestAuthorization(
            options: [.alert, .sound, .badge, .criticalAlert, .providesAppNotificationSettings]
        )
    }

    func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func didRegisterForRemoteNotifications(with deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        sendDeviceToken(token)
    }

    func didFailToRegisterForRemoteNotifications(with error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
    }

    private func sendDeviceToken(_ token: String) {
        Task {
            var request = URLRequest(url: URL(string: "https://api.example.com/devices")!)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let body = ["device_token": token, "platform": "ios"]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            _ = try await URLSession.shared.data(for: request)
        }
    }
}
```

## Notification Handling

```swift
extension PushNotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo

        guard let type = userInfo["type"] as? String else {
            completionHandler([.banner, .sound])
            return
        }

        switch type {
        case "message":
            completionHandler([.banner, .sound, .badge])
        case "silent_update":
            handleSilentUpdate(userInfo)
            completionHandler([])
        case "critical_alert":
            completionHandler([.banner, .sound, .badge, .list])
        default:
            completionHandler([.banner])
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        switch response.actionIdentifier {
        case UNNotificationDefaultActionIdentifier:
            handleNotificationTap(userInfo)
        case "REPLY_ACTION":
            handleReply(response: response, userInfo: userInfo)
        case "MARK_READ":
            markAsRead(userInfo)
        default:
            break
        }

        completionHandler()
    }

    private func handleNotificationTap(_ userInfo: [AnyHashable: Any]) {
        guard let deepLink = userInfo["deep_link"] as? String,
              let url = URL(string: deepLink) else { return }

        DeepLinkHandler.shared.handleURL(url)
    }
}
```

## Notification Categories

```swift
class NotificationCategoryManager {
    static func registerCategories() {
        let replyAction = UNTextInputNotificationAction(
            identifier: "REPLY_ACTION",
            title: "Reply",
            options: [.authenticationRequired],
            textInputButtonTitle: "Send",
            textInputPlaceholder: "Type your message..."
        )

        let markReadAction = UNNotificationAction(
            identifier: "MARK_READ",
            title: "Mark as Read",
            options: [.authenticationRequired]
        )

        let messageCategory = UNNotificationCategory(
            identifier: "MESSAGE",
            actions: [replyAction, markReadAction],
            intentIdentifiers: [],
            hiddenPreviewsBodyPlaceholder: "New message",
            categorySummaryFormat: "%u new messages",
            options: [.customDismissAction]
        )

        let orderCategory = UNNotificationCategory(
            identifier: "ORDER_UPDATE",
            actions: [markReadAction],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            messageCategory, orderCategory
        ])
    }

    static func createLocalNotification(title: String, body: String, categoryId: String, delay: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.categoryIdentifier = categoryId
        content.sound = .default
        content.badge = 1

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }
}
```

## Key Points

- Request notification permissions at appropriate time
- Register for remote notifications after permission granted
- Send device token to backend immediately
- Handle both foreground and background notifications
- Use notification categories for interactive actions
- Implement silent push for background updates
- Handle notification tap to navigate to correct screen
- Support rich notifications with images and media
- Use notification service extension for content encryption
- Handle notification grouping and summary
- Implement critical alerts for urgent notifications
- Test notification flows with push notification tools
