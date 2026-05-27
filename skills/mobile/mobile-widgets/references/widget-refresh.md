# Widget Refresh Strategy

## Overview
Widget refresh strategy determines how and when widget content is updated. Balancing timeliness against battery life and data usage requires careful consideration of update frequency, refresh triggers, and content staleness tolerance.

## Update Mechanisms

### Push vs Pull Updates

```kotlin
enum class UpdateMechanism {
    PUSH, PULL, HYBRID
}

data class RefreshPolicy(
    val mechanism: UpdateMechanism,
    val minimumInterval: Long,
    val maximumStaleness: Long,
    val priority: RefreshPriority,
    val powerAware: Boolean = true,
    val dataAware: Boolean = true
)

enum class RefreshPriority {
    HIGH, MEDIUM, LOW, BACKGROUND
}
```

### WorkManager for Scheduled Updates

```kotlin
class WidgetUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val widgetType = inputData.getString(WIDGET_TYPE_KEY) ?: return Result.failure()

        return try {
            when (widgetType) {
                "sales" -> updateSalesWidgets()
                "inventory" -> updateInventoryWidgets()
                "analytics" -> updateAnalyticsWidgets()
                else -> Result.failure()
            }
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    private suspend fun updateSalesWidgets(): Result {
        val context = applicationContext
        val manager = AppWidgetManager.getInstance(context)
        val provider = ComponentName(context, SalesWidgetProvider::class.java)
        val widgetIds = manager.getAppWidgetIds(provider)

        if (widgetIds.isEmpty()) return Result.success()

        val updater = SalesWidgetUpdater(context)
        for (widgetId in widgetIds) {
            updater.updateWidget(manager, widgetId)
        }
        return Result.success()
    }

    companion object {
        const val WIDGET_TYPE_KEY = "widget_type"

        fun schedulePeriodicUpdates(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            val salesRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setInputData(
                    workDataOf(WIDGET_TYPE_KEY to "sales")
                )
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    1, TimeUnit.MINUTES
                )
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    "widget_sales_update",
                    ExistingPeriodicWorkPolicy.KEEP,
                    salesRequest
                )
        }
    }
}
```

## Smart Refresh Timing

### Adaptive Refresh Intervals

```kotlin
class AdaptiveRefreshScheduler(
    private val context: Context
) {
    private val prefs = context.getSharedPreferences(
        "widget_refresh", Context.MODE_PRIVATE
    )

    fun calculateNextInterval(
        widgetType: String,
        dataFreshness: DataFreshness
    ): Long {
        val baseInterval = prefs.getLong(
            "${widgetType}_base_interval",
            TimeUnit.MINUTES.toMillis(15)
        )

        return when (dataFreshness) {
            DataFreshness.STALE -> maxOf(
                baseInterval / 2,
                TimeUnit.MINUTES.toMillis(5)
            )
            DataFreshness.FRESH -> baseInterval
            DataFreshness.UNCHANGED -> minOf(
                baseInterval * 2,
                TimeUnit.HOURS.toMillis(1)
            )
        }
    }

    fun recordUpdateResult(
        widgetType: String,
        hadChanges: Boolean
    ) {
        val key = "${widgetType}_no_change_count"
        val count = prefs.getInt(key, 0)

        if (hadChanges) {
            prefs.edit().putInt(key, 0).apply()
            prefs.edit().putLong(
                "${widgetType}_base_interval",
                maxOf(
                    prefs.getLong("${widgetType}_base_interval",
                        TimeUnit.MINUTES.toMillis(15)
                    ) / 2,
                    TimeUnit.MINUTES.toMillis(5)
                )
            ).apply()
        } else {
            val newCount = count + 1
            prefs.edit().putInt(key, newCount).apply()
            if (newCount >= 3) {
                val current = prefs.getLong(
                    "${widgetType}_base_interval",
                    TimeUnit.MINUTES.toMillis(15)
                )
                prefs.edit().putLong(
                    "${widgetType}_base_interval",
                    minOf(current * 2, TimeUnit.HOURS.toMillis(1))
                ).apply()
                prefs.edit().putInt(key, 0).apply()
            }
        }
    }
}
```

### Battery-Aware Scheduling

```kotlin
class BatteryAwareScheduler(private val context: Context) {

    private val batteryManager = context.getSystemService(
        Context.BATTERY_SERVICE
    ) as BatteryManager

    fun shouldRefresh(): Boolean {
        val status = getBatteryStatus()
        return when (status) {
            BatteryStatus.CHARGING -> true
            BatteryStatus.HIGH -> {
                val interval = prefs.getLong("battery_high_interval", 15)
                isTimeElapsed(interval)
            }
            BatteryStatus.LOW -> {
                val interval = prefs.getLong("battery_low_interval", 60)
                isTimeElapsed(interval)
            }
            BatteryStatus.CRITICAL -> false
        }
    }

    private fun getBatteryStatus(): BatteryStatus {
        val level = batteryManager.getIntProperty(
            BatteryManager.BATTERY_PROPERTY_CAPACITY
        )
        return when {
            batteryManager.isCharging() -> BatteryStatus.CHARGING
            level > 60 -> BatteryStatus.HIGH
            level > 20 -> BatteryStatus.LOW
            else -> BatteryStatus.CRITICAL
        }
    }

    private fun isTimeElapsed(intervalMinutes: Long): Boolean {
        val lastUpdate = prefs.getLong("last_widget_update", 0)
        val elapsed = System.currentTimeMillis() - lastUpdate
        return elapsed >= TimeUnit.MINUTES.toMillis(intervalMinutes)
    }
}
```

## iOS Timeline Refresh

```swift
struct AdaptiveTimelineProvider: TimelineProvider {

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<SalesEntry>) -> Void
    ) {
        Task {
            let now = Date()
            let data = await fetchData()
            let refreshPolicy = determineRefreshPolicy(
                dataChanged: data.hasChangedSinceLastFetch,
                batteryState: await UIDevice.current.batteryState,
                isLowPowerMode: ProcessInfo.processInfo.isLowPowerModeEnabled
            )

            let nextUpdate: Date
            switch refreshPolicy {
            case .aggressive:
                nextUpdate = now.addingTimeInterval(5 * 60)
            case .normal:
                nextUpdate = now.addingTimeInterval(15 * 60)
            case .conservative:
                nextUpdate = now.addingTimeInterval(60 * 60)
            case .deferred:
                nextUpdate = Calendar.current.date(
                    bySettingHour: 8, minute: 0, second: 0, of: now
                ) ?? now.addingTimeInterval(3600)
            }

            let entries = generateEntries(from: data, from: now, to: nextUpdate)
            let timeline = Timeline(
                entries: entries,
                policy: .after(nextUpdate)
            )
            completion(timeline)
        }
    }

    private func determineRefreshPolicy(
        dataChanged: Bool,
        batteryState: UIDevice.BatteryState,
        isLowPowerMode: Bool
    ) -> RefreshPolicy {
        if isLowPowerMode {
            return .conservative
        }
        switch batteryState {
        case .charging, .full:
            return dataChanged ? .aggressive : .normal
        case .unplugged:
            return dataChanged ? .normal : .conservative
        default:
            return .conservative
        }
    }
}
```

## Push-Based Updates

### Firebase Cloud Messaging for Widget Refresh

```kotlin
class WidgetUpdateFCMService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val widgetType = message.data["widget_type"]
        if (widgetType == null) return

        val manager = AppWidgetManager.getInstance(this)
        val provider = when (widgetType) {
            "sales" -> ComponentName(this, SalesWidgetProvider::class.java)
            "inventory" -> ComponentName(this, InventoryWidgetProvider::class.java)
            else -> return
        }

        val widgetIds = manager.getAppWidgetIds(provider)
        if (widgetIds.isEmpty()) return

        val intent = Intent(this, WidgetUpdateService::class.java).apply {
            action = ACTION_REFRESH_WIDGETS
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
            putExtra("widget_provider", provider.className)
            putExtra("data", message.data["payload"])
        }
        startService(intent)
    }

    companion object {
        const val ACTION_REFRESH_WIDGETS = "com.example.REFRESH_WIDGETS"
    }
}
```

### iOS Background Tasks for Widget Refresh

```swift
import BackgroundTasks

class WidgetBackgroundRefresher {

    static func register() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.example.widgetrefresh",
            using: nil
        ) { task in
            handleWidgetRefresh(task: task as! BGAppRefreshTask)
        }
    }

    static func schedule() {
        let request = BGAppRefreshTaskRequest(
            identifier: "com.example.widgetrefresh"
        )
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    static func handleWidgetRefresh(task: BGAppRefreshTask) {
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1

        let operation = BlockOperation {
            Task {
                let data = await SalesAPIClient.shared.fetchDashboardSummary()
                WidgetCenter.shared.reloadTimelines(ofKind: "SalesSummary")
                task.setTaskCompleted(success: true)
            }
        }
        queue.addOperation(operation)

        task.expirationHandler = {
            queue.cancelAllOperations()
            task.setTaskCompleted(success: false)
        }
    }
}
```

## Staleness Handling

```swift
struct StalenessManager {
    enum ContentFreshness {
        case current
        case stale(duration: TimeInterval)
        case expired
    }

    static func evaluateFreshness(
        lastUpdated: Date,
        maximumAge: TimeInterval = 300
    ) -> ContentFreshness {
        let age = Date().timeIntervalSince(lastUpdated)
        if age < maximumAge {
            return .current
        } else if age < maximumAge * 3 {
            return .stale(duration: age)
        } else {
            return .expired
        }
    }

    static func shouldShowContent(
        freshness: ContentFreshness,
        isVisible: Bool
    ) -> Bool {
        switch freshness {
        case .current:
            return true
        case .stale:
            return isVisible
        case .expired:
            return false
        }
    }
}
```

## Key Points

- WorkManager provides reliable periodic scheduling for Android widgets with battery and network constraints.
- Adaptive refresh intervals expand (less frequent) when data is unchanged and contract when data changes frequently.
- Battery-aware scheduling defers updates when battery is low and refreshes aggressively when charging.
- iOS TimelineProvider refresh policy adapts based on battery state and low power mode.
- Push-based updates via FCM (Android) or remote notifications (iOS) trigger immediate widget refreshes.
- Background tasks on iOS schedule periodic widget updates within system-imposed time limits.
- Staleness management defines thresholds for current, stale, and expired content states.
- Backoff policies prevent rapid retries on failure with exponential backoff.
- Widget visibility tracking avoids unnecessary updates when widgets are off-screen.
- Content change detection compares fetched data to previously displayed data before updating.
