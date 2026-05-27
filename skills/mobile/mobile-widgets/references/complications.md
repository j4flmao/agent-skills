# Complications (Watch Widgets)

## Overview
Complications are small elements on watch faces that display data from apps at a glance. On watchOS, complications appear on the clock face in various positions (corners, subdials, circular areas). On Wear OS, tiles and complications provide similar functionality. Complications update periodically and respond to user taps.

## watchOS Complications

### Complication Controller

```swift
import ClockKit

struct SalesComplicationController: CLKComplicationDataSource {

    // MARK: - Timeline Configuration

    func getComplicationDescriptors(
        handler: @escaping ([CLKComplicationDescriptor]) -> Void
    ) {
        let descriptors = [
            CLKComplicationDescriptor(
                identifier: "sales_summary",
                displayName: "Sales Summary",
                supportedFamilies: [
                    .modularSmall, .modularLarge,
                    .utilitarianSmall, .utilitarianSmallFlat,
                    .utilitarianLarge, .circularSmall,
                    .extraLarge, .graphicCorner,
                    .graphicCircular, .graphicRectangular,
                    .graphicBezel, .graphicExtraLarge
                ]
            ),
            CLKComplicationDescriptor(
                identifier: "top_product",
                displayName: "Top Product",
                supportedFamilies: [
                    .modularSmall, .utilitarianSmall,
                    .circularSmall, .graphicCircular
                ]
            )
        ]
        handler(descriptors)
    }

    // MARK: - Timeline Entries

    func getTimelineEndDate(
        for complication: CLKComplication,
        withHandler handler: @escaping (Date?) -> Void
    ) {
        handler(Date().addingTimeInterval(86400))
    }

    func getTimelineEntries(
        for complication: CLKComplication,
        before date: Date,
        limit: Int,
        withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void
    ) {
        Task {
            let data = await SalesManager.shared.fetchComplicationData()
            var entries: [CLKComplicationTimelineEntry] = []

            for minuteOffset in stride(from: -60, to: 0, by: 15) {
                let entryDate = Calendar.current.date(
                    byAdding: .minute, value: minuteOffset, to: date
                ) ?? date

                if let template = self.template(
                    for: complication.family, data: data
                ) {
                    let entry = CLKComplicationTimelineEntry(
                        date: entryDate,
                        complicationTemplate: template
                    )
                    entries.append(entry)
                }
            }
            handler(entries)
        }
    }

    func getTimelineEntries(
        for complication: CLKComplication,
        after date: Date,
        limit: Int,
        withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void
    ) {
        Task {
            let data = await SalesManager.shared.fetchComplicationData()
            var entries: [CLKComplicationTimelineEntry] = []

            for minuteOffset in stride(from: 15, to: 60 * 4, by: 15) {
                let entryDate = Calendar.current.date(
                    byAdding: .minute, value: minuteOffset, to: date
                ) ?? date

                if let template = self.template(
                    for: complication.family, data: data
                ) {
                    let entry = CLKComplicationTimelineEntry(
                        date: entryDate,
                        complicationTemplate: template
                    )
                    entries.append(entry)
                }
            }
            handler(entries)
        }
    }

    // MARK: - Templates

    func template(
        for family: CLKComplicationFamily,
        data: ComplicationData
    ) -> CLKComplicationTemplate? {
        switch family {
        case .modularSmall:
            return modularSmallTemplate(data: data)
        case .modularLarge:
            return modularLargeTemplate(data: data)
        case .utilitarianSmall, .utilitarianSmallFlat:
            return utilitarianSmallTemplate(data: data)
        case .utilitarianLarge:
            return utilitarianLargeTemplate(data: data)
        case .circularSmall:
            return circularSmallTemplate(data: data)
        case .extraLarge:
            return extraLargeTemplate(data: data)
        case .graphicCorner:
            return graphicCornerTemplate(data: data)
        case .graphicCircular:
            return graphicCircularTemplate(data: data)
        case .graphicRectangular:
            return graphicRectangularTemplate(data: data)
        case .graphicBezel:
            return graphicBezelTemplate(data: data)
        case .graphicExtraLarge:
            return graphicExtraLargeTemplate(data: data)
        @unknown default:
            return nil
        }
    }

    // MARK: - Template Builders

    private func modularSmallTemplate(data: ComplicationData) -> CLKComplicationTemplate {
        let textProvider = CLKSimpleTextProvider(
            text: data.revenueFormatted,
            shortText: data.revenueShortFormatted
        )
        let imageProvider = CLKImageProvider(
            onePieceImage: UIImage(systemName: "dollarsign.circle")!
        )
        return CLKComplicationTemplateModularSmallStackText(
            line1TextProvider: textProvider,
            line2TextProvider: CLKSimpleTextProvider(text: "Revenue")
        )
    }

    private func modularLargeTemplate(data: ComplicationData) -> CLKComplicationTemplate {
        let header = CLKSimpleTextProvider(text: "Sales")
        let body1 = CLKSimpleTextProvider(
            text: "\(data.revenueFormatted) • \(data.orderCount) orders"
        )
        let body2 = CLKSimpleTextProvider(
            text: "Top: \(data.topProductName)"
        )
        return CLKComplicationTemplateModularLargeTable(
            headerTextProvider: header,
            row1Column1TextProvider: CLKSimpleTextProvider(text: "Revenue"),
            row1Column2TextProvider: body1,
            row2Column1TextProvider: CLKSimpleTextProvider(text: "Top"),
            row2Column2TextProvider: body2
        )
    }

    private func graphicCornerTemplate(data: ComplicationData) -> CLKComplicationTemplate {
        let gaugeProvider = CLKSimpleGaugeProvider(
            style: .fill,
            gaugeValues: [data.progressToGoal],
            colors: [.green, .yellow, .red],
            gaugeColorLocations: [0.5, 0.8],
            fillFraction: data.progressToGoal
        )
        let outerText = CLKSimpleTextProvider(text: data.revenueFormatted)
        let innerText = CLKSimpleTextProvider(text: "\(Int(data.progressToGoal * 100))%")
        return CLKComplicationTemplateGraphicCornerGaugeText(
            gaugeProvider: gaugeProvider,
            outerTextProvider: outerText,
            innerTextProvider: innerText
        )
    }

    private func graphicCircularTemplate(data: ComplicationData) -> CLKComplicationTemplate {
        let imageProvider = CLKFullColorImageProvider(
            fullColorImage: UIImage(systemName: "chart.pie")!
        )
        return CLKComplicationTemplateGraphicCircularImage(
            imageProvider: imageProvider
        )
    }

    private func graphicRectangularTemplate(data: ComplicationData) -> CLKComplicationTemplate {
        let textProvider = CLKSimpleTextProvider(text: data.revenueFormatted + "\n" + data.topProductName)
        return CLKComplicationTemplateGraphicRectangularStandardBody(
            headerTextProvider: CLKSimpleTextProvider(text: "Revenue"),
            body1TextProvider: CLKSimpleTextProvider(text: data.revenueFormatted),
            body2TextProvider: CLKSimpleTextProvider(text: data.topProductName)
        )
    }

    private func dateLiteralTemplate(data: ComplicationData) -> CLKComplicationTemplate {
        let date = Date()
        let dateProvider = CLKDateTextProvider(date: date, units: [.day, .month])
        return CLKComplicationTemplateModularSmallStackText(
            line1TextProvider: dateProvider,
            line2TextProvider: CLKSimpleTextProvider(text: data.revenueFormatted)
        )
    }

    // MARK: - Placeholder

    func getLocalizableSampleTemplate(
        for complication: CLKComplication,
        handler: @escaping (CLKComplicationTemplate?) -> Void
    ) {
        let sampleData = ComplicationData(
            revenue: 12500,
            revenueFormatted: "$12.5K",
            revenueShortFormatted: "$12.5K",
            orderCount: 43,
            topProductName: "Widget Pro",
            progressToGoal: 0.68
        )
        handler(template(for: complication.family, data: sampleData))
    }
}
```

### Complication Data Model

```swift
struct ComplicationData: Codable {
    let revenue: Double
    let revenueFormatted: String
    let revenueShortFormatted: String
    let orderCount: Int
    let topProductName: String
    let progressToGoal: Float
}

// Background refresh for complications
class ComplicationUpdateService {
    static let shared = ComplicationUpdateService()

    func scheduleUpdates() {
        let manager = CLKComplicationServer.sharedInstance()
        for complication in manager.activeComplications ?? [] {
            manager.reloadTimeline(for: complication)
        }
    }

    func updateWithBackgroundTask() {
        Task {
            let data = await SalesManager.shared.fetchComplicationData()
            cacheData(data)
            DispatchQueue.main.async {
                CLKComplicationServer.sharedInstance()
                    .reloadTimeline(
                        for: CLKComplicationDescriptor(
                            identifier: "sales_summary",
                            displayName: "Sales",
                            supportedFamilies: CLKComplicationFamily.allCases
                        ).complication!
                    )
            }
        }
    }

    private func cacheData(_ data: ComplicationData) {
        if let encoded = try? JSONEncoder().encode(data) {
            UserDefaults.sharedSuite?.set(
                encoded, forKey: "complication_data"
            )
        }
    }
}
```

## Wear OS Complications

### Complication Data Source

```kotlin
class SalesComplicationDataSource : ComplicationDataSourceService() {

    override fun onComplicationActivated(
        complicationId: Int,
        dataType: Int,
        complicationManager: ComplicationManager
    ) {
        super.onComplicationActivated(complicationId, dataType, complicationManager)
        scheduleUpdate(complicationId)
    }

    override fun onComplicationUpdate(
        complicationId: Int,
        dataType: Int,
        complicationManager: ComplicationManager
    ) {
        val data = fetchComplicationData()
        val complicationData = when (dataType) {
            ComplicationData.TYPE_SHORT_TEXT -> {
                ShortTextComplicationData.Builder(
                    data.revenueFormatted,
                    ComplicationText.EMPTY
                ).build()
            }
            ComplicationData.TYPE_LONG_TEXT -> {
                LongTextComplicationData.Builder(
                    ComplicationText.Builder(data.revenueFormatted).build(),
                    ComplicationText.Builder("${data.orderCount} orders").build()
                ).build()
            }
            ComplicationData.TYPE_RANGED_VALUE -> {
                val builder = RangedValueComplicationData.Builder(
                    data.progressToGoal,
                    ComplicationText.Builder(data.revenueFormatted).build(),
                    0.0, 1.0
                )
                builder.setContentDescription(
                    "${data.revenueFormatted} of goal"
                )
                builder.build()
            }
            ComplicationData.TYPE_ICON -> {
                IconComplicationData.Builder(
                    complicationIcon
                ).build()
            }
            else -> null
        }

        if (complicationData != null) {
            complicationManager.updateComplicationData(
                complicationId, complicationData
            )
        }

        scheduleUpdate(complicationId)
    }

    private fun scheduleUpdate(complicationId: Int) {
        val updateRequest = ComplicationUpdateRequester.getInstance(this)
        updateRequest.requestUpdate(this, complicationId)
    }

    private fun fetchComplicationData(): ComplicationData {
        val prefs = getSharedPreferences("complication_cache", MODE_PRIVATE)
        val json = prefs.getString("complication_data", null)
        return if (json != null) {
            Gson().fromJson(json, ComplicationData::class.java)
        } else {
            ComplicationData.default()
        }
    }
}
```

### Complication Tiles

```kotlin
class SalesTileService : TileService() {

    override fun onTileRequest(requestParams: RequestParams,
                                callback: TileRequest.TileRequestCallback) {
        val data = fetchComplicationData()
        val tile = createTile(data)
        callback.onTileRequestComplete(tile)
    }

    private fun createTile(data: ComplicationData): Tile {
        val timeline = Timeline.Builder().addTimelineEntry(
            TimelineEntry.Builder().build()
        ).build()

        val layout = when {
            data.progressToGoal > 0.7 -> R.layout.tile_sales_positive
            data.progressToGoal > 0.4 -> R.layout.tile_sales_neutral
            else -> R.layout.tile_sales_negative
        }

        val tileLayout = PrimaryLayout.Builder(
            applicationContext
        ).setContentDescription("Sales summary")
            .build()

        return Tile.Builder()
            .setResourcesVersion(1)
            .setFreshnessInterval(TimeUnit.MINUTES.toMillis(15))
            .build()
    }
}
```

## Data Flow

```swift
class ComplicationDataManager {
    static let shared = ComplicationDataManager()

    private let cache = NSCache<NSString, ComplicationData>()

    func fetchData() async -> ComplicationData {
        if let cached = cache.object(forKey: "complication") {
            if Date().timeIntervalSince(cached.timestamp) < 60 {
                return cached
            }
        }
        do {
            let data = await SalesAPIClient.shared.fetchComplicationData()
            cache.setObject(data, forKey: "complication")
            return data
        } catch {
            if let cached = cache.object(forKey: "complication") {
                return cached
            }
            return ComplicationData.placeholder()
        }
    }
}
```

## Key Points

- watchOS CLKComplicationDataSource provides timeline entries with templates optimized for each complication family.
- Complication families include modular, utilitarian, circular, extra large, and graphic styles for different watch faces.
- TimelineEntry objects pair a date with a complication template to show data at specific times.
- Gauge providers display progress toward goals with color gradients in graphic corner complications.
- Placeholder templates use sample data for the watch face customization preview.
- Wear OS ComplicationDataSourceService handles short text, long text, ranged value, and icon data types.
- Tiles provide full-screen glanceable experiences on Wear OS similar to complications.
- Background refresh uses CLKComplicationServer.reloadTimeline on watchOS and WorkManager on Wear OS.
- Complications should cache data locally to display immediately while network data loads.
- Timestamp tracking ensures complications show fresh data without excessive network calls.
