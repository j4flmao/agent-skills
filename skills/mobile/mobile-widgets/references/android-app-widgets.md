# Android App Widgets

## Overview
Android App Widgets are miniature application views that can be embedded in the home screen, lock screen, and other surfaces. They provide at-a-glance information and quick actions without opening the full app. Android widgets use RemoteViews for rendering and a broadcast-based update mechanism.

## Widget Configuration

### Widget Manifest Declaration

```xml
<!-- AndroidManifest.xml -->
<receiver
    android:name=".widgets.SalesWidgetProvider"
    android:exported="true"
    android:label="Sales Summary"
    android:description="@string/widget_sales_description"
    android:icon="@mipmap/ic_widget_sales">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/sales_widget_info" />
</receiver>
```

### Widget Info XML

```xml
<!-- res/xml/sales_widget_info.xml -->
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:minResizeWidth="180dp"
    android:minResizeHeight="80dp"
    android:maxResizeWidth="500dp"
    android:maxResizeHeight="300dp"
    android:widgetCategory="home_screen|keyguard"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_sales_loading"
    android:configure=".widgets.SalesWidgetConfigureActivity"
    android:description="@string/widget_sales_description"
    android:previewLayout="@layout/widget_sales_preview"
    android:targetCellWidth="3"
    android:targetCellHeight="1"
    android:widgetFeatures="reconfigurable|configuration_optional" />
```

## Widget Provider

### WidgetProvider Implementation

```kotlin
class SalesWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        val minWidth = newOptions.getInt(
            AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH
        )
        val minHeight = newOptions.getInt(
            AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT
        )
        val widgetSize = WidgetSize.fromDp(minWidth, minHeight)
        updateWidget(context, appWidgetManager, appWidgetId, widgetSize)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            WidgetPreferences(context).removeWidgetConfig(widgetId)
        }
    }

    override fun onEnabled(context: Context) {
        WidgetUpdateScheduler.schedulePeriodicUpdate(context)
    }

    override fun onDisabled(context: Context) {
        WidgetUpdateScheduler.cancelPeriodicUpdate(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_DATA_UPDATED -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val widgetIds = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, SalesWidgetProvider::class.java)
                )
                for (widgetId in widgetIds) {
                    updateWidget(context, appWidgetManager, widgetId)
                }
            }
        }
    }
}
```

### Widget Update Logic

```kotlin
class SalesWidgetUpdater(private val context: Context) {

    suspend fun updateWidget(
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        try {
            val config = WidgetPreferences(context)
                .getWidgetConfig(appWidgetId) ?: WidgetConfig.DEFAULT
            val storeId = config.storeId
            val data = SalesRepository.fetchDashboardSummary(storeId)
            val size = getWidgetSize(appWidgetManager, appWidgetId)
            val views = createRemoteViews(data, size, storeId)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            Log.e("SalesWidget", "Update failed", e)
            val views = RemoteViews(
                context.packageName,
                R.layout.widget_sales_error
            )
            views.setTextViewText(
                R.id.error_message,
                context.getString(R.string.widget_update_error)
            )
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    private fun getWidgetSize(
        manager: AppWidgetManager,
        widgetId: Int
    ): WidgetSize {
        val options = manager.getAppWidgetOptions(widgetId)
        val minWidth = options.getInt(
            AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH
        )
        val minHeight = options.getInt(
            AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT
        )
        return WidgetSize.fromDp(minWidth, minHeight)
    }
}
```

## RemoteViews Layouts

### Widget Layouts

```xml
<!-- res/layout/widget_sales_small.xml -->
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@drawable/widget_background">

    <TextView
        android:id="@+id/title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Revenue"
        android:textSize="12sp"
        android:textColor="@color/widget_secondary" />

    <TextView
        android:id="@+id/revenue_amount"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="$0"
        android:textSize="22sp"
        android:textStyle="bold"
        android:textColor="@color/widget_primary"
        android:layout_marginTop="4dp" />

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="8dp">

        <ImageView
            android:id="@+id/trend_icon"
            android:layout_width="16dp"
            android:layout_height="16dp"
            android:src="@drawable/ic_trend_up" />

        <TextView
            android:id="@+id/order_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="0 orders"
            android:textSize="11sp"
            android:textColor="@color/widget_secondary"
            android:layout_marginStart="4dp" />
    </LinearLayout>
</LinearLayout>
```

```xml
<!-- res/layout/widget_sales_medium.xml -->
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:padding="16dp"
    android:background="@drawable/widget_background">

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
            android:id="@+id/title"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Revenue"
            android:textSize="12sp"
            android:textColor="@color/widget_secondary" />

        <TextView
            android:id="@+id/revenue_amount"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="$0"
            android:textSize="28sp"
            android:textStyle="bold"
            android:textColor="@color/widget_primary" />

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:layout_marginTop="8dp">

            <TextView
                android:id="@+id/order_count"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="0 orders"
                android:textSize="11sp"
                android:textColor="@color/widget_secondary" />

            <TextView
                android:id="@+id/avg_order_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="$0 avg"
                android:textSize="11sp"
                android:textColor="@color/widget_secondary"
                android:layout_marginStart="12dp" />
        </LinearLayout>
    </LinearLayout>

    <View
        android:layout_width="1dp"
        android:layout_height="match_parent"
        android:background="@color/widget_divider"
        android:layout_marginHorizontal="12dp" />

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Top Product"
            android:textSize="12sp"
            android:textColor="@color/widget_secondary" />

        <TextView
            android:id="@+id/top_product"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="---"
            android:textSize="14sp"
            android:textStyle="medium"
            android:textColor="@color/widget_primary"
            android:layout_marginTop="4dp" />
    </LinearLayout>
</LinearLayout>
```

## Data Loading

```kotlin
object SalesRepository {

    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
        defaultRequest {
            url("https://api.example.com/")
            contentType(ContentType.Application.Json)
        }
    }

    suspend fun fetchDashboardSummary(storeId: String): DashboardSummary {
        return try {
            val response = client.get("v1/dashboard/summary") {
                parameter("store_id", storeId)
            }
            response.body<DashboardSummary>()
        } catch (e: Exception) {
            Log.e("SalesRepository", "Fetch failed", e)
            DashboardSummary.empty()
        }
    }
}

data class DashboardSummary(
    val totalRevenue: Double,
    val orderCount: Int,
    val averageOrderValue: Double,
    val topProductName: String,
    val revenueTrend: Double,
    val relevanceScore: Float
) {
    companion object {
        fun empty() = DashboardSummary(
            totalRevenue = 0.0,
            orderCount = 0,
            averageOrderValue = 0.0,
            topProductName = "",
            revenueTrend = 0.0,
            relevanceScore = 0f
        )
    }
}
```

## Intent Handling

```kotlin
fun createRemoteViews(
    data: DashboardSummary,
    size: WidgetSize,
    storeId: String
): RemoteViews {
    val packageName = context.packageName
    val layoutId = when (size) {
        WidgetSize.SMALL -> R.layout.widget_sales_small
        WidgetSize.MEDIUM -> R.layout.widget_sales_medium
        WidgetSize.LARGE -> R.layout.widget_sales_large
    }

    val views = RemoteViews(packageName, layoutId)

    views.setTextViewText(R.id.revenue_amount,
        formatCurrency(data.totalRevenue))
    views.setTextViewText(R.id.order_count,
        "${data.orderCount} orders")
    views.setTextViewText(R.id.top_product, data.topProductName)

    if (data.revenueTrend > 0) {
        views.setImageViewResource(R.id.trend_icon, R.drawable.ic_trend_up)
    } else {
        views.setImageViewResource(R.id.trend_icon, R.drawable.ic_trend_down)
    }

    val openAppIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
        data = Uri.parse("myapp://store/$storeId")
    }
    val pendingIntent = PendingIntent.getActivity(
        context, 0, openAppIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or
        PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

    return views
}
```

## Glance API (Jetpack Glance)

```kotlin
class SalesGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = SalesRepository.fetchDashboardSummary("default")

        provideContent {
            SalesWidgetContent(data)
        }
    }

    @Composable
    fun SalesWidgetContent(data: DashboardSummary) {
        val size = LocalSize.current
        when {
            size.isSmall -> SmallWidget(data)
            size.isMedium -> MediumWidget(data)
            else -> LargeWidget(data)
        }
    }
}

@Composable
fun SmallWidget(data: DashboardSummary) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp)
    ) {
        Text("Revenue", style = TextStyle(
            fontSize = 12.sp,
            color = ColorProvider.secondary
        ))
        Text(
            text = formatCurrency(data.totalRevenue),
            style = TextStyle(
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider.primary
            ),
            modifier = GlanceModifier.padding(top = 4.dp)
        )
        Row(
            modifier = GlanceModifier.padding(top = 8.dp)
        ) {
            Image(
                provider = if (data.revenueTrend > 0)
                    ImageProvider(R.drawable.ic_trend_up)
                else
                    ImageProvider(R.drawable.ic_trend_down),
                contentDescription = "Trend"
            )
            Text(
                text = "${data.orderCount} orders",
                style = TextStyle(
                    fontSize = 11.sp,
                    color = ColorProvider.secondary
                ),
                modifier = GlanceModifier.padding(start = 4.dp)
            )
        }
    }
}
```

## Key Points

- Android widgets use RemoteViews for rendering, which limits UI to specific view types and their methods.
- AppWidgetProvider extends BroadcastReceiver and handles lifecycle callbacks (onUpdate, onDeleted, onEnabled, onDisabled).
- Widget configuration can be optional or required, specified in the widget info XML.
- Widget size changes trigger onAppWidgetOptionsChanged for adaptive layouts.
- updatePeriodMillis should be 0 for manual scheduling; periodic updates use WorkManager or AlarmManager.
- Glance API provides a Compose-style DSL for building widget layouts with type-safe Kotlin.
- PendingIntents handle click actions and deep linking from widgets into the app.
- Data loading uses coroutines and handles errors gracefully with fallback UI states.
- Widget preferences store per-widget configuration (selected store, display options).
- Preview layouts (previewLayout attribute) show widget appearance in the widget picker.
