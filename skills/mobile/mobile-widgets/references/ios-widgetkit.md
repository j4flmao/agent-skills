# iOS WidgetKit

## Overview
WidgetKit is Apple's framework for creating widgets on iOS, iPadOS, and macOS. Widgets display timely, relevant content from your app at a glance on the Home Screen, Lock Screen, and Today View. Widgets use SwiftUI for their UI and a Timeline Provider to manage content updates.

## Widget Architecture

### Widget Configuration

```swift
import WidgetKit
import SwiftUI

@main
struct SalesWidgetBundle: WidgetBundle {
    var body: some Widget {
        SalesSummaryWidget()
        TopProductsWidget()
        RevenueChartWidget()
    }
}

struct SalesSummaryWidget: Widget {
    let kind: String = "com.example.sales.SalesSummary"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: SalesTimelineProvider()
        ) { entry in
            SalesWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Sales Summary")
        .description("View your daily sales at a glance.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryRectangular,
            .accessoryInline
        ])
        .contentMarginsDisabled()
    }
}
```

## Timeline Provider

### Timeline Entry

```swift
struct SalesEntry: TimelineEntry {
    let date: Date
    let totalSales: Double
    let orderCount: Int
    let averageOrderValue: Double
    let topProduct: String
    let trend: TrendDirection
    let isPlaceholder: Bool
    let relevance: TimelineEntryRelevance?

    static func placeholder() -> SalesEntry {
        SalesEntry(
            date: Date(),
            totalSales: 0,
            orderCount: 0,
            averageOrderValue: 0,
            topProduct: "---",
            trend: .neutral,
            isPlaceholder: true,
            relevance: nil
        )
    }
}

enum TrendDirection {
    case up, down, neutral
}
```

### Timeline Provider

```swift
struct SalesTimelineProvider: TimelineProvider {

    func placeholder(in context: Context) -> SalesEntry {
        SalesEntry.placeholder()
    }

    func getSnapshot(
        in context: Context,
        completion: @escaping (SalesEntry) -> Void
    ) {
        if context.isPreview {
            completion(SalesEntry.placeholder())
            return
        }
        Task {
            let entry = await loadCurrentData()
            completion(entry)
        }
    }

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<SalesEntry>) -> Void
    ) {
        Task {
            let entries = await generateTimelineEntries()
            let timeline = Timeline(
                entries: entries,
                policy: .after(entries.last?.date ?? Date().addingTimeInterval(900))
            )
            completion(timeline)
        }
    }

    private func loadCurrentData() async -> SalesEntry {
        let data = await SalesAPIClient.shared.fetchDashboardSummary()
        return SalesEntry(
            date: Date(),
            totalSales: data.totalRevenue,
            orderCount: data.orderCount,
            averageOrderValue: data.averageOrderValue,
            topProduct: data.topProductName,
            trend: data.revenueTrend > 0 ? .up : .down,
            isPlaceholder: false,
            relevance: TimelineEntryRelevance(score: data.relevanceScore)
        )
    }

    private func generateTimelineEntries() async -> [SalesEntry] {
        let now = Date()
        var entries: [SalesEntry] = []
        let data = await SalesAPIClient.shared.fetchDashboardSummary()

        for minuteOffset in stride(from: 0, to: 60, by: 15) {
            let entryDate = Calendar.current.date(
                byAdding: .minute, value: minuteOffset, to: now
            ) ?? now
            let entry = SalesEntry(
                date: entryDate,
                totalSales: data.totalRevenue,
                orderCount: data.orderCount,
                averageOrderValue: data.averageOrderValue,
                topProduct: data.topProductName,
                trend: data.revenueTrend > 0 ? .up : .down,
                isPlaceholder: false,
                relevance: TimelineEntryRelevance(score: data.relevanceScore)
            )
            entries.append(entry)
        }
        return entries
    }
}
```

## Widget Views

### SwiftUI Views

```swift
struct SalesWidgetEntryView: View {
    var entry: SalesEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallSalesWidget(entry: entry)
        case .systemMedium:
            MediumSalesWidget(entry: entry)
        case .systemLarge:
            LargeSalesWidget(entry: entry)
        case .accessoryRectangular:
            LockScreenWidget(entry: entry)
        case .accessoryInline:
            InlineWidget(entry: entry)
        default:
            SmallSalesWidget(entry: entry)
        }
    }
}

struct SmallSalesWidget: View {
    let entry: SalesEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Revenue")
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(entry.totalSales, format: .currency(code: "USD"))
                .font(.title2)
                .fontWeight(.bold)
                .minimumScaleFactor(0.8)

            HStack(spacing: 4) {
                Image(
                    systemName: entry.trend == .up
                    ? "arrow.up.right" : "arrow.down.right"
                )
                .foregroundStyle(entry.trend == .up ? .green : .red)

                Text("\(entry.orderCount) orders")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity,
               alignment: .leading)
    }
}

struct MediumSalesWidget: View {
    let entry: SalesEntry

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Revenue")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(entry.totalSales, format: .currency(code: "USD"))
                    .font(.title)
                    .fontWeight(.bold)

                HStack {
                    Label("\(entry.orderCount)", systemImage: "cart")
                    Label(entry.averageOrderValue,
                          format: .currency(code: "USD"),
                          systemImage: "cart.badge")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Divider()

            VStack(alignment: .leading, spacing: 4) {
                Text("Top Product")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(entry.topProduct)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity,
               alignment: .leading)
    }
}
```

## Network Calls in Widgets

```swift
class SalesAPIClient {
    static let shared = SalesAPIClient()
    private let session: URLSession
    private let decoder = JSONDecoder()

    private init() {
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        config.timeoutIntervalForRequest = 30
        config.requestCachePolicy = .returnCacheDataElseLoad
        self.session = URLSession(configuration: config)
    }

    func fetchDashboardSummary() async -> DashboardSummary {
        guard let url = URL(
            string: "https://api.example.com/v1/dashboard/summary"
        ) else {
            return DashboardSummary.empty()
        }
        do {
            let (data, response) = try await session.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return DashboardSummary.empty()
            }
            let summary = try decoder.decode(
                DashboardSummary.self, from: data
            )
            return summary
        } catch {
            return DashboardSummary.empty()
        }
    }
}

struct DashboardSummary: Codable {
    let totalRevenue: Double
    let orderCount: Int
    let averageOrderValue: Double
    let topProductName: String
    let revenueTrend: Double
    let relevanceScore: Float

    static func empty() -> DashboardSummary {
        DashboardSummary(
            totalRevenue: 0, orderCount: 0,
            averageOrderValue: 0, topProductName: "",
            revenueTrend: 0, relevanceScore: 0
        )
    }
}
```

## Widget URL Navigation

```swift
struct TopProductsWidgetEntryView: View {
    var entry: TopProductsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Top Products")
                .font(.headline)

            ForEach(entry.products.prefix(3)) { product in
                Link(destination: URL(
                    string: "myapp://product/\(product.id)"
                )!) {
                    ProductRow(product: product)
                }
            }
        }
        .widgetURL(URL(string: "myapp://products"))
    }
}

struct ProductRow: View {
    let product: ProductSummary

    var body: some View {
        HStack {
            Text(product.name)
                .font(.subheadline)
                .lineLimit(1)
            Spacer()
            Text(product.revenue, format: .currency(code: "USD"))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.green)
        }
    }
}

// Deep link handling in the main app
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    func handleDeepLink(_ url: URL) {
        guard url.scheme == "myapp" else { return }
        if url.pathComponents.count >= 2 && url.pathComponents[0] == "product" {
            let productId = url.pathComponents[1]
            NavigationManager.shared.navigateToProduct(productId)
        }
    }
}
```

## Widget Configuration Intent

```swift
import AppIntents

struct SelectStoreIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Select Store"
    static let description = IntentDescription(
        "Choose which store to display."
    )

    @Parameter(title: "Store")
    var store: StoreEntity?

    static var parameterSummary: some ParameterSummary {
        Summary("Select \(\.$store)")
    }
}

struct StoreEntity: AppEntity {
    let id: String
    let name: String
    let displayName: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        "Store"
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(displayName)")
    }

    static var defaultQuery = StoreQuery()
}

struct StoreQuery: EntityQuery {
    func entities(for identifiers: [StoreEntity.ID]) async throws -> [StoreEntity] {
        let stores = await StoreRepository.shared.getStores()
        return stores.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [StoreEntity] {
        await StoreRepository.shared.getStores()
    }
}
```

## Key Points

- WidgetKit uses a TimelineProvider protocol to supply entries with dates for content scheduling.
- Timeline entries specify a refresh policy (atEnd, after date, never) to control update frequency.
- Widget families include systemSmall, systemMedium, systemLarge, and accessory sizes for Lock Screen.
- Placeholder and snapshot data handle preview and loading states without network dependency.
- Network calls in widgets should use cached data with timeout and gracefully handle failures.
- widgetURL and Link views enable deep linking from widgets into the main app.
- Configuration Intents let users customize widget content (e.g., select a specific store).
- TimelineEntryRelevance hints to the system about which widgets to promote on the Smart Stack.
- containerBackground is required for iOS 17+ widgets to fill the widget background correctly.
- Widgets should minimize CPU and network usage since they run with limited system resources.
