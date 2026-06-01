# Mobile Localization Fundamentals

## Overview
Mobile localization (l10n) adapts an app's content and behavior for different languages, regions, and cultures. It covers string translation, locale-specific formatting (dates, numbers, currencies), right-to-left (RTL) layout support, and pluralization.

## Core Concepts

### Locale Identifier
BCP 47 language tags: `en-US` (English US), `de-DE` (German Germany), `zh-Hans` (Simplified Chinese), `ar-SA` (Arabic Saudi Arabia). iOS uses `NSLocale` with identifiers like `en_US`. Android uses `Locale` with language and country. Unicode CLDR provides locale data.

### String Resources
iOS: `Localizable.strings` files per language (`en.lproj`, `de.lproj`). `"key" = "value";` format. Android: `res/values/strings.xml` (default), `res/values-de/strings.xml` (German). `ICULegacy` for ICU message format. Flutter: `.arb` files (App Resource Bundle) in `lib/l10n/`.

### ICU Message Format
Standard for complex messages with plurals, gender, and selectors. `{count, plural, one {# item} other {# items}}`. `{gender, select, male {He} female {She} other {They}}`. Supported by Flutter arb, Android ICU, and iOS `String` with format specifiers.

### RTL Support
Arabic, Hebrew, Persian, and Urdu are right-to-left. Set `layoutDirection` per locale. Use `leading`/`trailing` instead of `left`/`right` for layout constraints. iOS: `UISemanticContentAttribute.forceRightToLeft`. Android: `android:supportsRtl="true"`. Test RTL with every locale addition.

## Architecture Patterns

### Translation Management
Store strings in key-value format (arb, strings.xml, strings). Use translation management system (POEditor, Lokalise, Crowdin, Phrase). Separate translators from developers — translators use web UI, developers commit generated files. Auto-translate for initial pass, human review for quality.

### Pluralization Rules
Languages have different plural categories: English (1, other), Arabic (6 categories), Russian (4). ICU plural syntax handles all languages. Define plurals in arb with `{count, plural, one {...} other {...}}`. Android uses `<plurals>` with `quantity` attribute.

### String Concatenation
Never concatenate strings for dynamic content — order varies by language. Use placeholders: `"Your order {count} is ready"`. Positional arguments: `"{0} purchased {1} items"`. Named parameters: `"Hello {name}, you have {count} messages"`. iOS: `String(format:)`. Android: `getString(R.string.key, arg1, arg2)`.

## Implementation

### Flutter — ARB Localization
```dart
// app_en.arb
{ "@@locale": "en", "orderCount": "{count, plural, one={{count} order} other={{count} orders}}" }

// app_de.arb  
{ "@@locale": "de", "orderCount": "{count, plural, one={{count} Bestellung} other={{count} Bestellungen}}" }

// Usage
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
Text(AppLocalizations.of(context)!.orderCount(5));
```

### Android — strings.xml
```xml
<!-- res/values/strings.xml -->
<string name="welcome">Welcome, %s</string>
<plurals name="order_count">
    <item quantity="one">%d order</item>
    <item quantity="other">%d orders</item>
</plurals>

<!-- res/values-de/strings.xml -->
<string name="welcome">Willkommen, %s</string>
<plurals name="order_count">
    <item quantity="one">%d Bestellung</item>
    <item quantity="other">%d Bestellungen</item>
</plurals>

// Usage
getString(R.string.welcome, userName)
resources.getQuantityString(R.plurals.order_count, count, count)
```

### iOS — Localizable.strings
```swift
// en.lproj/Localizable.strings
"welcome" = "Welcome, %@";
"order_count" = "%d orders";

// de.lproj/Localizable.strings
"welcome" = "Willkommen, %@";
"order_count.format" = "%d Bestellungen";

// Usage
String(format: NSLocalizedString("welcome", comment: ""), userName)
String(format: NSLocalizedString("order_count", comment: ""), count)
```

## Date/Number Formatting

### Locale-Aware Formatting
```dart
// Flutter
import 'package:intl/intl.dart';
final format = DateFormat.yMMMMd(Localizations.localeOf(context));
final formatted = format.format(date);
```

```kotlin
// Android
val format = DateFormat.getDateInstance(DateFormat.LONG, Locale.getDefault())
val formatted = format.format(date)
```

```swift
// iOS
let format = DateFormatter()
format.locale = Locale.current
format.dateStyle = .long
let formatted = format.string(from: date)
```

## Testing Localization

### Pseudo-Localization
Prefix each string with a marker (e.g., `[!!` ... `!!]`) to identify untranslated strings. Expand strings by 30-50% to test layout with longer text. Enable pseudo-localization in development mode. iOS: Edit Scheme > Arguments > `-NSShowNonLocalizedStrings YES`.

### Language Testing
Test every locale on real device. Check: truncation (German strings are 30% longer), RTL layout mirroring, date/number formatting, plural forms, special characters, text direction in mixed-language content. Use automated screenshot comparison.

## Key Points
- Use ICU Message Format for plurals and gender
- Never concatenate strings — use placeholders and positional args
- Translate via TMS (POEditor, Lokalise, Crowdin)
- RTL: use leading/trailing instead of left/right
- Pseudo-localization: expand strings by 30-50% to test layout
- Date/number formatting via locale-aware libraries
- Test all locales on real devices for truncation and RTL
- Generate localized screenshots for App Store / Play Store
- String keys should be descriptive (not index-based)
- Review translations in context (not as isolated strings)
