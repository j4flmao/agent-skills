# Mobile Widgets Advanced Topics

## Overview
Advanced mobile widgets cover interactive widgets, live activities (iOS), deep linking from widgets, widget animations, widget families, widget configuration UI, and performance optimization.

## Interactive Widgets

### iOS — Interactive Widgets (iOS 17+)
Widgets support buttons, toggles, and sliders via `Button` and `Toggle` in widget view. `AppIntent` handles interaction: define intent with `@Parameter` for input data. System launches app in background to process intent. User does not leave home screen.

```swift
// Intent
struct MarkOrderPaidIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark Order Paid"
    @Parameter(title: "Order ID") var orderId: String

    func perform() async throws -> some IntentResult {
        await markPaid(orderId)
        return .result()
    }
}

// Widget button
Button(intent: MarkOrderPaidIntent(orderId: order.id)) {
    Text("Mark Paid")
}
```

### Android — Widget Actions
`PendingIntent` for widget button clicks. `RemoteViews.setOnClickPendingIntent` for tap actions. `setOnClickFillInIntent` for list items. `Activity.startActivity` for app launch. Broadcast receiver for custom actions without opening app.

### Widget Deep Linking
iOS: `WidgetURL` or `Link` widget target opens app with deeplink. `AppDelegate` handles URL. Navigate to specific screen based on widget context. Deep link includes widget configuration data.

Android: `PendingIntent.getActivity` with data extras or `Intent.setData(Uri.parse("myapp://orders/123"))`. Widget tap opens app to relevant screen. Handle in Activity `onNewIntent`.

## Live Activities (iOS)

### ActivityKit (iOS 16.1+)
Live Activities display real-time updates on Dynamic Island and Lock Screen. Start activity via `Activity.request(attributes:contentState:)`. Update with `Activity.update(using:)`. End with `Activity.end(using:dismissalPolicy:)`.

```swift
// Start live activity
let attributes = OrderAttributes(orderId: "123")
let state = OrderAttributes.ContentState(status: "preparing")
let activity = try Activity.request(attributes: attributes, content: state)

// Update
let updatedState = OrderAttributes.ContentState(status: "delivering")
await activity.update(using: updatedState)

// End
await activity.end(using: finalState, dismissalPolicy: .default)
```

### Push to Start
Remote notification launches Live Activity without app running. Payload includes `content-state` and `attributes`. APNs push token per activity. `attributes-type` identifies activity type. Supports data-only push for content updates.

### Dynamic Island
Automatic placement: compact (leading/trailing), minimal (center), expanded (long press). Design for all three presentations. Compact shows key info, expanded shows details. Use `island.content` for compact and `island.expandedContent` for expanded views.

## Widget Families (iOS)

### Supporting Multiple Sizes
Provide different layouts for small, medium, large. `@Environment(\.widgetFamily)` to access size. Adaptive design per size: small = key metric, medium = metric + chart, large = full list.
```swift
struct WidgetView: View {
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall: SmallView()
        case .systemMedium: MediumView()
        case .systemLarge: LargeView()
        default: SmallView()
        }
    }
}
```

### Extra Large (iPad)
`.systemExtraLarge` available on iPad. Full dashboard view. Same timeline provider, different layout. Use adaptive layout pattern for all sizes. Test on iPad home screen and Stage Manager.

## Configuration UI

### iOS — Intent Definition
Define `Intent` in `.intentdefinition` file. Xcode generates Swift types. Parameters with `@Parameter` for user-configurable options (dropdown, text, number). `IntentDescription` for widget edit UI title. Supports dynamic options via `DynamicOptionsProvider`.

### Android — Configuration Activity
`android:configure` attribute in AppWidgetProviderInfo XML. Activity launched before widget added. User selects options, result passed back via `AppWidgetManager.EXTRA_APPWIDGET_ID`. Store config in SharedPreferences. Widget reads on first update.

### Preview and Placeholder
iOS: `placeholder(in:)` returns static placeholder during loading. `getSnapshot(in:)` for widget gallery preview. Use sample data, not real user data, in snapshots. Cache snapshot result to avoid blocking widget gallery.

## Performance Optimization

### Timeline Budget
iOS WidgetKit has 30s timeline generation budget. Cache data between entries. Use shared container precomputed data. Avoid network calls in timeline provider (use app refresh). Timeline generated in background, not on home screen scroll.

### RemoteViews Performance
Android RemoteViews serialization has overhead. Keep layout hierarchy shallow (max 3-4 levels). Avoid nested weights. Update only changed views with `setXXX` methods. Use `RemoteViewsService` for efficient list updates. Batch RemoteViews operations.

### Update Frequency
iOS: timeline entries for known future data (schedule). `WidgetCenter.shared.reloadAllTimelines()` only when data changes (not periodically). Android: minimize `updatePeriodMillis` (30 min max). Use push-based updates via broadcasts. Batch updates for multiple widget instances.

## Testing

### Preview All Sizes
Test widget in small, medium, large, extra large. Test on different home screen wallpapers. Test widget colors in light and dark mode. Test with actual data (not just placeholder). Verify timeline entries render correctly across time boundaries.

### Redundancy
Handle data unavailability gracefully (loading state, error state, no data state). Test with network off, degraded data, and first launch. Widget should never show empty/blank. Default fallback content always visible.

## Key Points
- Interactive widgets (iOS 17+): AppIntent for button/toggle actions without app launch
- Live Activities (iOS 16.1+): Dynamic Island + Lock Screen real-time updates
- ActivityKit: request → update → end lifecycle
- Push to Start: remote notification launches Live Activity
- Widget families: small, medium, large, extra large (iPad)
- Intent definition for configurable iOS widgets
- Timeline budget: 30s — cache data, avoid network
- RemoteViews hierarchy: shallow, no weights, batch updates
- Deep link from widget tap to specific screen
- Test all sizes, wallpapers, light/dark, and error states
