# iOS Localization

## Overview
iOS localization adapts your app for different languages, regions, and cultural conventions. Apple provides comprehensive tooling including Xcode localization export/import, base internationalization, and runtime APIs for formatting dates, numbers, and text direction.

## Strings Files

### Localizable.strings

```swift
// Base (English) - Localizable.strings
"sales.title" = "Sales";
"orders.title" = "Orders";
"products.title" = "Products";
"revenue.total" = "Total Revenue";
"revenue.daily" = "Daily Revenue";
"revenue.monthly" = "Monthly Revenue";
"order.count" = "%d orders";
"order.status.pending" = "Pending";
"order.status.shipped" = "Shipped";
"order.status.delivered" = "Delivered";
"product.popular" = "Popular Products";
"product.out_of_stock" = "Out of Stock";
"nav.dashboard" = "Dashboard";
"nav.settings" = "Settings";
"nav.profile" = "Profile";
"common.save" = "Save";
"common.cancel" = "Cancel";
"common.delete" = "Delete";
"common.search" = "Search";
"common.loading" = "Loading...";
"common.error" = "An error occurred";
"common.retry" = "Retry";
"common.no_results" = "No results found";
// French (fr) - Localizable.strings
"sales.title" = "Ventes";
"orders.title" = "Commandes";
"products.title" = "Produits";
"revenue.total" = "Revenu total";
"revenue.daily" = "Revenu quotidien";
"revenue.monthly" = "Revenu mensuel";
"order.count" = "%d commandes";
"order.status.pending" = "En attente";
"order.status.shipped" = "Expédié";
"order.status.delivered" = "Livré";
"product.popular" = "Produits populaires";
"product.out_of_stock" = "Rupture de stock";
"nav.dashboard" = "Tableau de bord";
"nav.settings" = "Paramètres";
"nav.profile" = "Profil";
"common.save" = "Enregistrer";
"common.cancel" = "Annuler";
"common.delete" = "Supprimer";
"common.search" = "Rechercher";
"common.loading" = "Chargement...";
"common.error" = "Une erreur est survenue";
"common.retry" = "Réessayer";
"common.no_results" = "Aucun résultat trouvé";
// Japanese (ja) - Localizable.strings
"sales.title" = "売上";
"orders.title" = "注文";
"products.title" = "商品";
"revenue.total" = "総収益";
"revenue.daily" = "日次収益";
"revenue.monthly" = "月次収益";
"order.count" = "%d件の注文";
"order.status.pending" = "保留中";
"order.status.shipped" = "発送済み";
"order.status.delivered" = "配達済み";
"nav.dashboard" = "ダッシュボード";
"common.save" = "保存";
"common.cancel" = "キャンセル";
"common.search" = "検索";
"common.loading" = "読み込み中...";
"common.error" = "エラーが発生しました";
"common.retry" = "再試行";
```

### String Catalogs (Xcode 15+)

```swift
// String Catalogs use .xcstrings format
// Example extracted from String Catalog JSON structure:

{
  "sourceLanguage" : "en",
  "strings" : {
    "sales.title" : {
      "localizations" : {
        "en" : { "stringUnit" : { "state" : "translated", "value" : "Sales" } },
        "fr" : { "stringUnit" : { "state" : "translated", "value" : "Ventes" } },
        "ja" : { "stringUnit" : { "state" : "translated", "value" : "売上" } },
        "ar" : { "stringUnit" : { "state" : "translated", "value" : "المبيعات" } },
        "zh-Hans" : { "stringUnit" : { "state" : "translated", "value" : "销售额" } }
      }
    },
    "order.count" : {
      "localizations" : {
        "en" : { "stringUnit" : { "state" : "translated", "value" : "%d orders" } },
        "fr" : { "stringUnit" : { "state" : "translated", "value" : "%d commandes" } },
        "ja" : { "stringUnit" : { "state" : "translated", "value" : "%d件の注文" } }
      }
    },
    "%d product(s)" : {
      "extractionState" : "manual",
      "localizations" : {
        "en" : { "variations" : {
          "plural" : {
            "one" : { "stringUnit" : { "state" : "translated", "value" : "%d product" } },
            "other" : { "stringUnit" : { "state" : "translated", "value" : "%d products" } }
          }
        }}
      }
    }
  }
}
```

## String Usage in Code

```swift
import SwiftUI

struct SalesDashboardView: View {
    @State private var orderCount = 42
    @State private var revenue: Double = 12500.00

    var body: some View {
        NavigationStack {
            List {
                Section(String(localized: "sales.title")) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String(localized: "revenue.total"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(revenue,
                             format: .currency(code: Locale.current.currency?.identifier ?? "USD"))
                            .font(.title)
                            .fontWeight(.bold)

                        Text(String(localized: "order.count", orderCount))
                            .font(.body)
                    }
                }

                Section(String(localized: "products.title")) {
                    ForEach(products) { product in
                        ProductRow(product: product)
                    }
                }
            }
            .navigationTitle(String(localized: "nav.dashboard"))
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(String(localized: "common.save")) { save() }
                }
            }
        }
    }
}
```

## Formatters

### Number and Currency Formatting

```swift
import Foundation

struct Formatters {
    static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale.current
        return f
    }()

    static let decimalFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = 0
        return f
    }()

    static let percentFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .percent
        f.maximumFractionDigits = 1
        return f
    }()

    static let compactFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.usesSignificantDigits = true
        f.maximumSignificantDigits = 3
        return f
    }()

    static func formatCurrency(_ value: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: value)) ?? "$0.00"
    }

    static func formatCompact(_ value: Double) -> String {
        let absValue = abs(value)
        let suffix: String
        let divided: Double
        switch absValue {
        case 1_000_000_000...:
            suffix = "B"
            divided = value / 1_000_000_000
        case 1_000_000...:
            suffix = "M"
            divided = value / 1_000_000
        case 1_000...:
            suffix = "K"
            divided = value / 1_000
        default:
            suffix = ""
            divided = value
        }
        let formatted = decimalFormatter.string(
            from: NSNumber(value: divided)
        ) ?? "\(divided)"
        return "\(formatted)\(suffix)"
    }
}

// Usage with FormatStyle (iOS 15+)
let revenue = 12500.00
let formatted = revenue.formatted(
    .currency(code: Locale.current.currency?.identifier ?? "USD")
)
```

### Date Formatting

```swift
struct DateFormatters {
    static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        f.locale = Locale.current
        return f
    }()

    static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        f.locale = Locale.current
        return f
    }()

    static let relativeFormatter: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        f.locale = Locale.current
        return f
    }()

    static let intervalFormatter: DateIntervalFormatter = {
        let f = DateIntervalFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        f.locale = Locale.current
        return f
    }()

    static func formatRelative(_ date: Date) -> String {
        relativeFormatter.localizedString(
            for: date, relativeTo: Date()
        )
    }
}
```

## Plural Rules

```swift
// SwiftGen approach for type-safe plurals
enum L10n {
    enum Orders {
        static func count(_ count: Int) -> String {
            let format = NSLocalizedString(
                "order.count", tableName: "Localizable",
                bundle: .main, value: "%d orders", comment: ""
            )
            return String(format: format, count)
        }
    }
}

// Using String Catalogs with variants
// In .xcstrings:
"product_count" = {
    "extractionState" = "manual";
    "localizations" = {
        "en" = {
            "variations" = {
                "plural" = {
                    "one" = {
                        "stringUnit" = {
                            "state" = "translated";
                            "value" = "%d product";
                        }
                    };
                    "other" = {
                        "stringUnit" = {
                            "state" = "translated";
                            "value" = "%d products";
                        }
                    };
                }
            }
        };
        "ar" = {
            "variations" = {
                "plural" = {
                    "one" = { "stringUnit" = {"state" = "translated"; "value" = "منتج واحد"}; };
                    "two" = { "stringUnit" = {"state" = "translated"; "value" = "منتجان"}; };
                    "few" = { "stringUnit" = {"state" = "translated"; "value" = "%d منتجات"}; };
                    "many" = { "stringUnit" = {"state" = "translated"; "value" = "%d منتجًا"}; };
                    "other" = { "stringUnit" = {"state" = "translated"; "value" = "%d منتج"}; };
                }
            }
        }
    };
};
```

## Right-to-Left Support

```swift
struct RTLSupportView: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        HStack {
            Image(systemName: "arrow.right")
            Text("Direction-aware layout")
            Image(systemName: "arrow.left")
        }

        // Use semantic properties instead of leading/trailing
        HStack {
            Text("Left aligned")
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("Right aligned")
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .environment(\.layoutDirection, layoutDirection)
    }
}

// Using semantic coordinates
struct ChartView: View {
    let values: [Double]

    var body: some View {
        GeometryReader { geometry in
            ForEach(values.indices, id: \.self) { index in
                Rectangle()
                    .fill(.blue)
                    .frame(width: barWidth,
                           height: geometry.size.height * values[index])
                    .position(
                        x: layoutDirection == .rightToLeft
                            ? geometry.size.width - (CGFloat(index) * barWidth + barWidth / 2)
                            : CGFloat(index) * barWidth + barWidth / 2,
                        y: geometry.size.height / 2
                    )
            }
        }
    }

    @Environment(\.layoutDirection) var layoutDirection
}
```

## Image Mirroring

```swift
import SwiftUI

struct ImageMirroring: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        VStack {
            // Auto-mirrored in RTL
            Image(systemName: "arrow.right")
                .flipsForRightToLeftLayoutDirection(true)

            // Never mirror (logos, photos)
            Image("company_logo")
                .flipsForRightToLeftLayoutDirection(false)

            // Manual mirroring for custom images
            Image("custom_arrow")
                .scaleEffect(
                    x: layoutDirection == .rightToLeft ? -1 : 1,
                    y: 1
                )
        }
    }
}
```

## Testing Locales

```swift
import XCTest

final class LocalizationTests: XCTestCase {

    func testCurrencyFormatting() {
        let locales: [(Locale, String)] = [
            (Locale(identifier: "en_US"), "$12,500.00"),
            (Locale(identifier: "fr_FR"), "12 500,00 €"),
            (Locale(identifier: "ja_JP"), "¥12,500"),
            (Locale(identifier: "de_DE"), "12.500,00 €"),
            (Locale(identifier: "ar_SA"), "١٢٬٥٠٠٫٠٠ ر.س.")
        ]
        for (locale, expected) in locales {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.locale = locale
            let result = formatter.string(
                from: NSNumber(value: 12500.00)
            )
            XCTAssertEqual(result, expected,
                           "Failed for locale \(locale.identifier)")
        }
    }
}
```

## Key Points

- Use String Catalogs (.xcstrings) for Xcode 15+ with built-in plural rules and variations support.
- Traditional .strings files still work but lack variant support and require separate .stringsdict for plurals.
- NumberFormatter and DateFormatter must use Locale.current for automatic localization.
- RelativeDateTimeFormatter provides human-readable relative dates (2 hours ago, yesterday).
- Plural rules vary by language (Arabic has 6 forms, English has 2, Japanese has 1).
- Image flipping with flipsForRightToLeftLayoutDirection handles directional image mirroring.
- Semantic layout properties (leading/trailing) adapt to layout direction automatically.
- Preview Providers with different locales allow visual testing of localized layouts in Xcode previews.
- Unit tests with locale-specific expected values catch formatting regressions across languages.
- Compact number formatting (1.5K, 2.3M) should adapt to locale-specific number separators.
