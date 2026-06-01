# Mobile Widgets Fundamentals

## Overview
Mobile widgets are lightweight, glanceable UI components that display app content on the device's home screen. iOS supports widgets via WidgetKit (iOS 14+). Android supports widgets via AppWidgetProvider. Widgets update periodically and can be interactive.

## Core Concepts

### Widget Lifecycle
Widgets are not full apps — they run in a separate process with limited resources. Lifecycle: configuration → display → periodic update → user interaction → removal. iOS WidgetKit manages widget lifecycle via TimelineProvider. Android broadcasts widget events via AppWidgetProvider.

### Timeline (iOS)
WidgetKit uses a timeline of entries. Each entry is a snapshot of widget content at a specific time. `TimelineProvider` provides the timeline. System renders widget for current time then advances to next entry. Refresh timeline in background without app launch.

### AppWidgetProvider (Android)
Broadcast receiver that handles widget lifecycle. `onUpdate` called at interval (min 30 min) or on user action. `onAppWidgetOptionsChanged` when widget resized. `onDeleted` / `onDisabled` for cleanup. `onReceive` for custom intents.

### Widget Sizes
iOS supports small (2x2), medium (4x2), and large (4x4) sizes. Android supports flexible sizes (minWidth/minHeight in dp). Users resize widgets on home screen. Provide adaptive layouts for all supported sizes. Test on different home screen grids.

## Architecture Patterns

### Shared Container (iOS)
Widget and main app share data via App Group container. `UserDefaults(suiteName:)` for shared preferences. FileManager shared container for files. Core Data with shared persistent store. Configure App Group capability in both targets.

### Configuration Intent (iOS)
Widget customization via SiriKit intent definition. `IntentTimelineProvider` for configurable widgets. User edits widget and selects options (city, stock, category). Options persisted in `NSUserDefaults` shared container. Multiple widget instances with different configs.

### Widget Preview (Android)
Android widgets use `RemoteViews` (limited to specific layouts). Layout inflation from XML with `RemoteViews(context, layoutId)` or `RemoteViewsFactory` for lists. `AppWidgetManager.updateAppWidget` for pushing updates. Use `RemoteViewsService` for collection widgets (ListView, GridView, StackView).

## Implementation

### iOS WidgetKit — Entry & Timeline
```swift
// Timeline Entry
struct OrderStatusEntry: TimelineEntry {
    let date: Date
    let orderCount: Int
    let isPaid: Bool
}

// Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> OrderStatusEntry {
        OrderStatusEntry(date: Date(), orderCount: 3, isPaid: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (OrderStatusEntry) -> ()) {
        let entry = OrderStatusEntry(date: Date(), orderCount: currentCount, isPaid: true)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entries = [
            OrderStatusEntry(date: Date(), orderCount: count, isPaid: true),
            OrderStatusEntry(date: Date().addingTimeInterval(3600), orderCount: count, isPaid: true),
        ]
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}
```

### iOS WidgetKit — View
```swift
struct OrderStatusWidgetEntryView: View {
    var entry: OrderStatusEntry

    var body: some View {
        VStack {
            Text("Orders: \(entry.orderCount)")
                .font(.headline)
            if entry.isPaid {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}
```

### Android — AppWidgetProvider
```kotlin
class OrderWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.widget_order)
            views.setTextViewText(R.id.widget_order_count, "Orders: $count")
            manager.updateAppWidget(widgetId, views)
        }
    }
}
```

```xml
<!-- widget_order.xml layout -->
<LinearLayout ...>
    <TextView android:id="@+id/widget_order_count"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content" />
</LinearLayout>
```

## Data Sharing

### App Groups (iOS)
Enable App Groups capability in both app and widget targets. `UserDefaults(suiteName: "group.com.example.app")`. File storage in shared container: `FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:)`. Core Data with shared SQLite store.

### SharedPreferences (Android)
Widget reads from SharedPreferences (same package). Provider/ContentProvider for complex data sharing. `RemoteViewsService` for collection widgets. Intent extras for direct data passing.

## Update Strategies

### Timeline Refresh (iOS)
`.atEnd` policy: system requests new timeline when entries exhausted. `.never`: widget never updates (static). `.after(date)`: update at specific time. WidgetCenter.shared.reloadAllTimelines() to force refresh from the app.

### Periodic Update (Android)
`updatePeriodMillis` in AppWidgetProviderInfo (minimum 30 min). `AlarmManager` / `WorkManager` for custom intervals. `AppWidgetManager.notifyAppWidgetViewDataChanged` for collection widget updates. Push broadcast from app for immediate update.

## Key Points
- iOS WidgetKit: TimelineProvider + Entry + View
- Android: AppWidgetProvider + RemoteViews + layout XML
- Shared data via App Groups (iOS) or SharedPreferences (Android)
- WidgetKit entries are time-anchored snapshots
- RemoteViews limited to specific layouts (no custom views)
- Widget sizes: adaptive layout for small/medium/large (iOS), flexible dp (Android)
- ConfigurationIntent for user-customizable iOS widgets
- RemoteViewsService for Android collection widgets
- Timeline refresh: atEnd, never, after(date)
- Test widget on different home screen grids
