---
name: mobile-widgets
description: >
  Enforce mobile widget development patterns for iOS WidgetKit (widgets, Live Activities)
  and Android App Widgets (widgets, complications). Covers timeline management, widget
  families, configuration, deep linking, refresh strategies, and testing. NOT for in-app
  UI components or full-screen experiences.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, widgets, phase-10]
---

# Mobile Widgets Skill

## Purpose
Build glanceable, performant widget experiences across iOS and Android with proper timeline management, refresh strategies, and platform-specific best practices.

## Agent Protocol

### Trigger
User mentions widgets, iOS WidgetKit, Android App Widgets, Live Activities, complications, watchOS complications, Wear OS tiles, widget timeline, widget families, widget configuration, widget deep linking, widget refresh, or widget testing.

### Input Context
- Platform target (iOS, Android, or both)
- Widget types (static, dynamic, configurable, Live Activity, complication)
- Widget families/sizes needed (small, medium, large, extra large)
- Data sources and update frequency
- Deep linking targets
- Refresh strategy (timeline-based, push, periodic)
- Configuration/ customization needs

### Output Artifact
SKILL.md adherence document plus implemented widget extensions, timeline providers, configuration UI, deep link handling, and refresh logic.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Widget extension created for target platform(s)
- [ ] Timeline provider implemented with proper reload strategy
- [ ] All widget families (small, medium, large) supported with appropriate layouts
- [ ] Widget configuration/intent handling implemented
- [ ] Deep linking from widget taps to app content
- [ ] Refresh strategy optimized for battery life (minimal background fetches)
- [ ] Widget previews/snapshots for gallery
- [ ] Live Activity (iOS) or complication (watchOS/Wear OS) if required
- [ ] Widget testing with different data states (empty, loading, error, populated)
- [ ] Accessibility support (VoiceOver, TalkBack, dynamic type)

### Max Response Length
4096 tokens

## Workflow

1. **iOS WidgetKit Timeline Provider**: Define how your widget provides content over time.

```swift
import WidgetKit
import SwiftUI

struct TodoProvider: TimelineProvider {
  typealias Entry = TodoEntry

  func placeholder(in context: Context) -> TodoEntry {
    TodoEntry(date: Date(), items: TodoItem.previewData)
  }

  func getSnapshot(in context: Context, completion: @escaping (TodoEntry) -> Void) {
    let entry = TodoEntry(date: Date(), items: loadCurrentItems())
    completion(entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodoEntry>) -> Void) {
    let entries: [TodoEntry] = generateEntries()
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
    let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
    completion(timeline)
  }

  private func generateEntries() -> [TodoEntry] {
    let now = Date()
    let items = loadCurrentItems()
    var entries: [TodoEntry] = []

    for minuteOffset in stride(from: 0, to: 60, by: 15) {
      let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: now)!
      entries.append(TodoEntry(date: entryDate, items: items))
    }

    return entries
  }
}
```

2. **Widget View & Entry**: SwiftUI views adapted to widget families.

```swift
struct TodoEntry: TimelineEntry {
  let date: Date
  let items: [TodoItem]
}

struct TodoWidgetEntryView: View {
  var entry: TodoProvider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:
      SmallTodoView(items: entry.items)
    case .systemMedium:
      MediumTodoView(items: entry.items)
    case .systemLarge:
      LargeTodoView(items: entry.items)
    default:
      MediumTodoView(items: entry.items)
    }
  }
}

struct SmallTodoView: View {
  let items: [TodoItem]

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("To-Do").font(.headline).foregroundColor(.secondary)
      ForEach(items.prefix(3)) { item in
        HStack(spacing: 4) {
          Image(systemName: item.isCompleted ? "checkmark.circle.fill" : "circle")
            .foregroundColor(item.isCompleted ? .green : .gray)
            .font(.caption)
          Text(item.title).font(.caption).lineLimit(1)
        }
      }
      if items.count > 3 {
        Text("+\(items.count - 3) more").font(.caption2).foregroundColor(.secondary)
      }
    }
    .padding()
    .widgetURL(URL(string: "myapp://todos"))
  }
}
```

3. **Widget Configuration with Intent**: User-configurable widgets via SiriKit intents.

```swift
import AppIntents

struct SelectListIntent: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Select List"
  static let description = IntentDescription("Choose which to-do list to display.")

  @Parameter(title: "List")
  var list: ListEntity?

  static var parameterSummary: some ParameterSummary {
    Summary("Show items from \(\.$list)")
  }
}

struct ListEntity: AppEntity {
  let id: String
  let name: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "List"
  static var defaultQuery = ListQuery()

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
}

struct ListQuery: EntityStringQuery {
  func entities(matching string: String) async throws -> [ListEntity] {
    return await ListStore.shared.lists.filter { $0.name.contains(string) }
  }

  func suggestedEntities() async throws -> [ListEntity] {
    return await ListStore.shared.lists
  }

  func defaultResult() async -> ListEntity? {
    return await ListStore.shared.lists.first
  }
}
```

4. **Live Activities (iOS 16.1+)**: Dynamic, real-time updates on Lock Screen and Dynamic Island.

```swift
import ActivityKit

struct DeliveryActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var driverName: String
    var estimatedMinutes: Int
    var status: DeliveryStatus
    var lastUpdate: Date
  }

  var orderId: String
  var restaurantName: String
}

enum DeliveryStatus: String, Codable, Hashable {
  case preparing
  case pickedUp
  case inTransit
  case delivered
}

func startDeliveryActivity(orderId: String, restaurantName: String) {
  let attributes = DeliveryActivityAttributes(orderId: orderId, restaurantName: restaurantName)
  let state = DeliveryActivityAttributes.ContentState(
    driverName: "",
    estimatedMinutes: 0,
    status: .preparing,
    lastUpdate: Date()
  )

  do {
    let activity = try Activity<DeliveryActivityAttributes>.request(
      attributes: attributes,
      content: ActivityContent(state: state, staleDate: nil),
      pushType: .token
    )
    print("Started Live Activity: \(activity.id)")
  } catch {
    print("Failed to start Live Activity: \(error)")
  }
}

func updateDeliveryActivity(activityId: String, state: DeliveryActivityAttributes.ContentState) {
  Task {
    let activity = Activity<DeliveryActivityAttributes>.activities.first { $0.id == activityId }
    await activity?.update(
      ActivityContent(state: state, staleDate: Date().addingTimeInterval(30 * 60))
    )
  }
}

// Live Activity SwiftUI view
struct DeliveryLiveActivityView: View {
  let context: ActivityViewContext<DeliveryActivityAttributes>

  var body: some View {
    HStack {
      VStack(alignment: .leading) {
        Text(context.attributes.restaurantName).font(.headline)
        Text(context.state.driverName).font(.caption).foregroundColor(.secondary)
      }
      Spacer()
      VStack(alignment: .trailing) {
        Text("\(context.state.estimatedMinutes) min").font(.title2).bold()
        Text(context.state.status.rawValue).font(.caption).foregroundColor(.blue)
      }
    }
    .padding()
    .activitySystemActionForegroundColor(.indigo)
  }
}
```

5. **Android App Widgets**: RemoteViews with configuration activity.

```kotlin
// TodoWidgetProvider.kt
class TodoWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (appWidgetId in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, appWidgetId)
    }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    for (appWidgetId in appWidgetIds) {
      TodoWidgetConfig.removeWidget(context, appWidgetId)
    }
  }

  override fun onEnabled(context: Context) {
    // Prepare for first widget instance
  }

  override fun onDisabled(context: Context) {
    // Clean up when last widget removed
  }

  companion object {
    internal fun updateAppWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int
    ) {
      val listId = TodoWidgetConfig.loadListPref(context, appWidgetId)
      val items = TodoRepository.getItems(listId)

      val views = RemoteViews(context.packageName, R.layout.todo_widget)
      views.setTextViewText(R.id.widget_title, getListName(listId))

      val rv = RemoteViews(context.packageName, R.layout.todo_widget_item)
      views.removeAllViews(R.id.widget_list_container)

      items.take(5).forEach { item ->
        val itemView = RemoteViews(context.packageName, R.layout.todo_widget_item)
        itemView.setTextViewText(R.id.item_text, item.title)
        itemView.setInt(R.id.item_checkbox, "setChecked", if (item.isCompleted) 1 else 0)

        val fillInIntent = Intent(context, MainActivity::class.java).apply {
          action = Intent.ACTION_VIEW
          data = Uri.parse("myapp://todo/${item.id}")
        }
        val pendingIntent = PendingIntent.getActivity(
          context, item.id.toInt(), fillInIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        itemView.setOnClickPendingIntent(R.id.item_container, pendingIntent)
        views.addView(R.id.widget_list_container, itemView)
      }

      val configIntent = Intent(context, TodoWidgetConfigureActivity::class.java).apply {
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
      }
      val configPendingIntent = PendingIntent.getActivity(
        context, appWidgetId, configIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_settings, configPendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}

// Widget layout: res/layout/todo_widget.xml
// <LinearLayout
//   xmlns:android="http://schemas.android.com/apk/res/android"
//   android:layout_width="match_parent"
//   android:layout_height="match_parent"
//   android:orientation="vertical"
//   android:padding="@dimen/widget_margin">
//   <LinearLayout android:orientation="horizontal" android:layout_width="match_parent">
//     <TextView android:id="@+id/widget_title" .../>
//     <ImageButton android:id="@+id/widget_settings" .../>
//   </LinearLayout>
//   <LinearLayout android:id="@+id/widget_list_container" android:orientation="vertical" .../>
// </LinearLayout>
```

6. **Widget Refresh Strategies**: Balance freshness with battery life.

```swift
// iOS Timeline reload strategies
enum ReloadPolicy {
  case after(Date)           // Fixed next update time
  case atEnd                 // Reload after last entry expires
  case never                 // Static content, never refreshes
}

// iOS Background refresh via push
func handleWidgetPush(token: String, data: [String: Any]) {
  let newEntry = TodoEntry(date: Date(), items: parseItems(from: data))
  WidgetCenter.shared.reloadTimelines(ofKind: "TodoWidget")
}

// Android periodic refresh
class TodoWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(...) {
    // Scheduled via AlarmManager or WorkManager
    val workRequest = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(
      15, TimeUnit.MINUTES
    ).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
      "widget_refresh",
      ExistingPeriodicWorkPolicy.KEEP,
      workRequest
    )
  }
}
```

7. **Widget Deep Linking**: Navigate to specific app screens on tap.

```swift
// iOS: widgetURL for the entire widget
// widgetUrl(URL(string: "myapp://dashboard"))

// iOS: Link for specific areas within widget
Link(destination: URL(string: "myapp://todo/\(item.id)")!) {
  Text(item.title)
}

// Android: PendingIntent with custom URI
val intent = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://todo/$itemId"))
val pendingIntent = PendingIntent.getActivity(context, requestCode, intent, flags)
views.setOnClickPendingIntent(R.id.item_container, pendingIntent)
```

8. **Widget Testing**: Preview with different data states.

```swift
// iOS widget previews
struct TodoWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      TodoWidgetEntryView(entry: TodoEntry(date: Date(), items: TodoItem.previewData))
        .previewContext(WidgetPreviewContext(family: .systemSmall))

      TodoWidgetEntryView(entry: TodoEntry(date: Date(), items: TodoItem.previewData))
        .previewContext(WidgetPreviewContext(family: .systemMedium))

      TodoWidgetEntryView(entry: TodoEntry(date: Date(), items: []))
        .previewContext(WidgetPreviewContext(family: .systemSmall))

      TodoWidgetEntryView(entry: TodoEntry(date: Date(), items: TodoItem.previewErrorData))
        .previewContext(WidgetPreviewContext(family: .systemLarge))
    }
  }
}
```

## Rules

1. Never perform network calls inside widget view/update code — use timeline refresh.
2. Always provide a placeholder view for loading states.
3. Never exceed 10MB widget binary size — keep assets minimal.
4. Always support all widget families the platform offers for your target.
5. Never use infinite timelines — always provide a finite set of entries.
6. Always test widgets with system Dark Mode and Accent Color.
7. Never use custom fonts not bundled in widget extension target.
8. Always provide snapshot data for widget gallery preview.
9. Never hardcode refresh intervals — respect user's battery settings.
10. Always implement tap targets with minimum 44pt touch area.
11. Never use UIWebView/WKWebView inside widgets (not supported).
12. Always provide accessibility labels for VoiceOver/TalkBack.
13. Never store large datasets in UserDefaults for widget access — use shared container.
14. Always handle empty state gracefully (no data view, not blank).
15. Never use animations that don't pause on Low Power Mode.
16. Always implement configurable widgets when user personalization is needed.
17. Never use UIKit/AppKit inside iOS widgets — SwiftUI only.
18. Always test widgets with different Dynamic Type sizes.
19. Never reload timeline more frequently than every 5 minutes (iOS) unless critical.
20. Always remove widget data when all widget instances are deleted.

## References
  - references/android-app-widgets.md — Android App Widgets
  - references/complications.md — Complications (Watch Widgets)
  - references/ios-widgetkit.md — iOS WidgetKit
  - references/mobile-widgets-advanced.md — Mobile Widgets Advanced Topics
  - references/mobile-widgets-fundamentals.md — Mobile Widgets Fundamentals
  - references/widget-refresh.md — Widget Refresh Strategy
## Handoff
- `mobile/mobile-localization` — Widget string localization and RTL support
- `design/ui-kit` — Widget design guidelines and brand consistency
- `frontend/react-native-widgets` — React Native widget bridge patterns
