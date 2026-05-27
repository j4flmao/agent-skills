---
name: mobile-localization
description: >
  Enforce mobile localization patterns for iOS (.strings, .xcstrings) and Android
  (strings.xml), including plural rules (CLDR), RTL layout support, OTA updates,
  translation management, locale detection, date/number formatting, and CI
  integration. NOT for web localization or server-side i18n.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, localization, phase-10]
---

# Mobile Localization Skill

## Purpose
Implement comprehensive mobile app localization covering string resources, pluralization, RTL layout, locale-aware formatting, and automated translation workflows.

## Agent Protocol

### Trigger
User mentions localization, i18n, l10n, internationalization, translations, RTL support, language support, locale detection, pluralization, .strings files, .xcstrings, strings.xml, translation management, pseudo-localization, or multilingual app support.

### Input Context
- Target languages and locales
- Platform(s) (iOS, Android, or both)
- Pluralization requirements (zero, one, two, few, many, other)
- RTL language support (Arabic, Hebrew, Persian, Urdu)
- OTA/localization update strategy
- Translation management tooling
- Date/number/currency formatting per locale
- Accessibility and right-to-left testing requirements

### Output Artifact
SKILL.md adherence document plus implemented localization files, RTL layout adjustments, locale formatting utilities, and CI configuration.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] All user-facing strings extracted to resource files (no hardcoded strings)
- [ ] Plural rules implemented using CLDR/ platform-specific pluralization
- [ ] RTL layout mirroring verified for all RTL target languages
- [ ] Locale-aware date, number, and currency formatting applied everywhere
- [ ] Pseudo-localization build configured for testing
- [ ] Translation import/export workflow defined
- [ ] CI validation for missing translations and placeholder mismatches
- [ ] OTA localization updates configured (if required)
- [ ] Accessibility strings localized (VoiceOver/TalkBack labels)
- [ ] Locale detection and persistence strategy implemented

### Max Response Length
4096 tokens

## Workflow

1. **iOS String Resources**: .strings, .stringsdict, and .xcstrings formats.

```xml
// en.lproj/Localizable.strings
"welcome.title" = "Welcome to Our App";
"welcome.subtitle" = "Discover amazing features";
"onboarding.next" = "Next";
"onboarding.skip" = "Skip";
"onboarding.finish" = "Get Started";
"settings.title" = "Settings";
"settings.language" = "Language";
"settings.notifications" = "Notifications";
"settings.privacy" = "Privacy Policy";
"profile.title" = "Profile";
"profile.edit" = "Edit Profile";
"profile.logout" = "Log Out";
"profile.delete_account" = "Delete Account";
"errors.network" = "Network error. Please try again.";
"errors.generic" = "Something went wrong.";
"errors.not_found" = "Resource not found.";
"search.placeholder" = "Search...";
"search.no_results" = "No results found for \"%@\"";
"common.cancel" = "Cancel";
"common.save" = "Save";
"common.delete" = "Delete";
"common.confirm" = "Confirm";
"common.loading" = "Loading...";
"common.retry" = "Retry";
"common.done" = "Done";
"common.share" = "Share";
"common.copy" = "Copy";
"common.paste" = "Paste";
"common.select" = "Select";
"common.deselect" = "Deselect";
"auth.login" = "Log In";
"auth.signup" = "Sign Up";
"auth.email" = "Email Address";
"auth.password" = "Password";
"auth.forgot_password" = "Forgot Password?";
"auth.reset_password" = "Reset Password";
"notification.empty" = "No notifications yet";
"notification.mark_read" = "Mark as Read";
"cart.empty" = "Your cart is empty";
"cart.total" = "Total: %@";
"cart.checkout" = "Proceed to Checkout";
"date.today" = "Today";
"date.yesterday" = "Yesterday";
"date.tomorrow" = "Tomorrow";
"quantity.units" = "%d units";
"quantity.items" = "%d items";

// en.lproj/Localizable.stringsdict (plurals)
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items.count</key>
  <dict>
    <key>NSStringLocalizedFormatKey</key>
    <string>%#@items@</string>
    <key>items</key>
    <dict>
      <key>NSStringFormatSpecTypeKey</key>
      <string>NSStringPluralRuleType</string>
      <key>NSStringFormatValueTypeKey</key>
      <string>d</string>
      <key>zero</key>
      <string>No items</string>
      <key>one</key>
      <string>%d item</string>
      <key>other</key>
      <string>%d items</string>
    </dict>
  </dict>
  <key>messages.count</key>
  <dict>
    <key>NSStringLocalizedFormatKey</key>
    <string>%#@messages@</string>
    <key>messages</key>
    <dict>
      <key>NSStringFormatSpecTypeKey</key>
      <string>NSStringPluralRuleType</string>
      <key>NSStringFormatValueTypeKey</key>
      <string>d</string>
      <key>zero</key>
      <string>No messages</string>
      <key>one</key>
      <string>%d message</string>
      <key>other</key>
      <string>%d messages</string>
    </dict>
  </dict>
</dict>
</plist>
```

2. **Android String Resources**: strings.xml with plurals and quantity strings.

```xml
<!-- res/values/strings.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">MyApp</string>
  <string name="welcome_title">Welcome to Our App</string>
  <string name="welcome_subtitle">Discover amazing features</string>
  <string name="onboarding_next">Next</string>
  <string name="onboarding_skip">Skip</string>
  <string name="onboarding_finish">Get Started</string>
  <string name="settings_title">Settings</string>
  <string name="settings_language">Language</string>
  <string name="settings_notifications">Notifications</string>
  <string name="settings_privacy">Privacy Policy</string>
  <string name="profile_title">Profile</string>
  <string name="profile_edit">Edit Profile</string>
  <string name="profile_logout">Log Out</string>
  <string name="profile_delete_account">Delete Account</string>
  <string name="errors_network">Network error. Please try again.</string>
  <string name="errors_generic">Something went wrong.</string>
  <string name="errors_not_found">Resource not found.</string>
  <string name="search_placeholder">Search...</string>
  <string name="search_no_results">No results found for %s</string>
  <string name="common_cancel">Cancel</string>
  <string name="common_save">Save</string>
  <string name="common_delete">Delete</string>
  <string name="common_confirm">Confirm</string>
  <string name="common_loading">Loading...</string>
  <string name="common_retry">Retry</string>
  <string name="common_done">Done</string>
  <string name="auth_login">Log In</string>
  <string name="auth_signup">Sign Up</string>
  <string name="auth_email">Email Address</string>
  <string name="auth_password">Password</string>
  <string name="auth_forgot_password">Forgot Password?</string>
  <string name="auth_reset_password">Reset Password</string>
  <string name="notification_empty">No notifications yet</string>
  <string name="cart_empty">Your cart is empty</string>
  <string name="cart_total">Total: %s</string>
  <string name="cart_checkout">Proceed to Checkout</string>
  <string name="date_today">Today</string>
  <string name="date_yesterday">Yesterday</string>
  <string name="date_tomorrow">Tomorrow</string>
  <string name="quantity_units">%d units</string>
  <string name="quantity_items">%d items</string>

  <!-- Plurals -->
  <plurals name="items_count">
    <item quantity="zero">No items</item>
    <item quantity="one">%d item</item>
    <item quantity="other">%d items</item>
  </plurals>

  <plurals name="messages_count">
    <item quantity="zero">No messages</item>
    <item quantity="one">%d message</item>
    <item quantity="other">%d messages</item>
  </plurals>
</resources>
```

3. **Locale-Aware Formatting**: Date, number, and currency per locale.

```swift
// iOS locale formatting
struct LocaleFormatter {
  static func formatCurrency(_ amount: Decimal, locale: Locale = .current) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = locale
    return formatter.string(from: amount as NSDecimalNumber) ?? "$\(amount)"
  }

  static func formatDate(_ date: Date, style: DateFormatter.Style = .medium, locale: Locale = .current) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = style
    formatter.locale = locale
    return formatter.string(from: date)
  }

  static func formatNumber(_ number: Double, locale: Locale = .current, maxFraction: Int = 2) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = maxFraction
    formatter.locale = locale
    return formatter.string(from: NSNumber(value: number)) ?? "\(number)"
  }

  static func formatRelativeDate(_ date: Date, locale: Locale = .current) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = locale
    formatter.unitsStyle = .full
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}
```

```kotlin
// Android locale formatting
object LocaleFormatter {
  fun formatCurrency(amount: BigDecimal, locale: Locale = Locale.getDefault()): String {
    val formatter = NumberFormat.getCurrencyInstance(locale)
    return formatter.format(amount)
  }

  fun formatDate(date: Date, locale: Locale = Locale.getDefault()): String {
    val format = DateFormat.getDateInstance(DateFormat.MEDIUM, locale)
    return format.format(date)
  }

  fun formatNumber(number: Double, locale: Locale = Locale.getDefault(), maxFraction: Int = 2): String {
    val formatter = NumberFormat.getNumberInstance(locale)
    formatter.maximumFractionDigits = maxFraction
    return formatter.format(number)
  }

  fun formatRelativeDate(date: Date, locale: Locale = Locale.getDefault()): String {
    val now = System.currentTimeMillis()
    val diff = now - date.time
    val minutes = diff / 60000
    val hours = minutes / 60
    val days = hours / 24

    return when {
      minutes < 1 -> "Just now"
      minutes < 60 -> "$minutes minute${if (minutes != 1L) "s" else ""} ago"
      hours < 24 -> "$hours hour${if (hours != 1L) "s" else ""} ago"
      days < 7 -> "$days day${if (days != 1L) "s" else ""} ago"
      else -> formatDate(date, locale)
    }
  }
}
```

4. **Locale Detection & Persistence**: Detect, store, and apply user's language preference.

```swift
// iOS locale management
class LocalizationManager: ObservableObject {
  @Published var currentLocale: Locale
  @AppStorage("app_language") private var languageCode: String = ""

  static let supportedLanguages = ["en", "es", "fr", "de", "ja", "zh-Hans", "ar", "he"]
  static let shared = LocalizationManager()

  private init() {
    let savedLanguage = UserDefaults.standard.string(forKey: "app_language")
    if let savedLanguage = savedLanguage {
      self.currentLocale = Locale(identifier: savedLanguage)
    } else {
      let preferredLanguage = Locale.preferredLanguages.first ?? "en"
      let normalized = Self.normalizeLanguageCode(preferredLanguage)
      self.currentLocale = Locale(identifier: normalized)
    }
  }

  func setLanguage(_ languageCode: String) {
    self.languageCode = languageCode
    self.currentLocale = Locale(identifier: languageCode)
    UserDefaults.standard.set([languageCode], forKey: "AppleLanguages")
    UserDefaults.standard.synchronize()

    NotificationCenter.default.post(name: .languageChanged, object: nil)
  }

  static func normalizeLanguageCode(_ code: String) -> String {
    let code = code.replacingOccurrences(of: "-", with: "_")
    if supportedLanguages.contains(code) { return code }
    let base = String(code.prefix(2))
    if supportedLanguages.contains(base) { return base }
    return "en"
  }
}
```

```kotlin
// Android locale management
class LocaleManager(private val context: Context) {
  private val prefs = context.getSharedPreferences("locale_prefs", Context.MODE_PRIVATE)

  companion object {
    val SUPPORTED_LOCALES = listOf(
      Locale.ENGLISH,
      Locale("es"),
      Locale("fr"),
      Locale("de"),
      Locale("ja"),
      Locale("zh"),
      Locale("ar"),
      Locale("he")
    )
  }

  fun getCurrentLocale(): Locale {
    val savedCode = prefs.getString("app_locale", "") ?: ""
    if (savedCode.isNotEmpty()) {
      return Locale.forLanguageTag(savedCode)
    }
    val systemLocale = Resources.getSystem().configuration.locales.get(0)
    return SUPPORTED_LOCALES.find { it.language == systemLocale.language } ?: Locale.ENGLISH
  }

  fun setLocale(locale: Locale): Context {
    prefs.edit().putString("app_locale", locale.toLanguageTag()).apply()

    val config = Configuration(context.resources.configuration)
    config.setLocale(locale)
    Locale.setDefault(locale)

    return context.createConfigurationContext(config)
  }

  fun applyToActivity(activity: Activity) {
    val locale = getCurrentLocale()
    val config = Configuration(activity.resources.configuration)
    config.setLocale(locale)
    activity.resources.updateConfiguration(config, activity.resources.displayMetrics)
  }
}
```

5. **RTL Layout Support**: Mirror layouts for right-to-left languages.

```swift
// iOS RTL support — SwiftUI
struct ContentView: View {
  @Environment(\.layoutDirection) var layoutDirection

  var body: some View {
    HStack {
      Image(systemName: "arrow.right")
        .flipsForRightToLeftLayoutDirection(true)
      Text("Direction-aware layout")
    }
    .environment(\.layoutDirection, layoutDirection)
  }
}

// Force specific direction for certain views
HStack {
  Text("Always LTR content")
}
.environment(\.layoutDirection, .leftToRight)
```

```xml
<!-- Android RTL — use start/end instead of left/right -->
<LinearLayout
  xmlns:android="http://schemas.android.com/apk/res/android"
  android:layout_width="match_parent"
  android:layout_height="wrap_content"
  android:paddingStart="16dp"
  android:paddingEnd="16dp"
  android:layout_marginStart="8dp"
  android:layout_marginEnd="8dp"
  android:gravity="start">

  <ImageView
    android:layout_width="24dp"
    android:layout_height="24dp"
    android:layout_marginEnd="8dp"
    android:src="@drawable/ic_back"
    android:autoMirrored="true"/>

  <TextView
    android:layout_width="0dp"
    android:layout_height="wrap_content"
    android:layout_weight="1"
    android:textAlignment="viewStart"/>
</LinearLayout>

<!-- Manifest -->
<application
  android:supportsRtl="true"
  ...>
```

6. **Pseudo-Localization**: Test UI layout with expanded/accented text.

```swift
// iOS pseudo-localization via scheme
// 1. Duplicate "en" locale as "en-XA" (pseudo-bidi) or "en-XP" (pseudo-accented)
// 2. Use Apple's built-in pseudo-language in scheme settings:
//    Product > Scheme > Edit Scheme > Run > Arguments > 
//    -AppleLanguages (en-XA) or -AppleLanguages (en-XP)

// Manual pseudo-localization function
func pseudoLocalize(_ string: String) -> String {
  let accentMap: [Character: Character] = [
    "a": "α", "e": "ε", "i": "ι", "o": "ο", "u": "υ",
    "A": "Α", "E": "Ε", "I": "Ι", "O": "Ο", "U": "Υ",
    "c": "ç", "C": "Ç", "n": "ñ", "N": "Ñ",
  ]

  var result = "["
  for char in string {
    result.append(accentMap[char] ?? char)
  }
  result.append("]")
  return result
}
```

7. **CI Validation**: Automated checks for missing translations and placeholder mismatches.

```yaml
# .github/workflows/localization-check.yml
name: Localization Check
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check iOS missing translations
        run: |
          for lang in en es fr de ja zh-Hans ar he; do
            if [ ! -f "ios/$lang.lproj/Localizable.strings" ]; then
              echo "Missing: ios/$lang.lproj/Localizable.strings"
              exit 1
            fi
          done

      - name: Check Android missing translations
        run: |
          for lang in es fr de ja zh ar he; do
            dir="android/src/main/res/values-$lang"
            if [ "$lang" = "en" ]; then dir="android/src/main/res/values"; fi
            if [ ! -f "$dir/strings.xml" ]; then
              echo "Missing: $dir/strings.xml"
              exit 1
            fi
          done

      - name: Validate iOS placeholder consistency
        run: |
          python scripts/check_placeholders.py \
            --base ios/en.lproj/Localizable.strings \
            --translations ios/*.lproj/Localizable.strings

      - name: Validate Android placeholder consistency
        run: |
          python scripts/check_android_placeholders.py \
            --base android/src/main/res/values/strings.xml \
            --translations android/src/main/res/values-*/strings.xml

      - name: Run pseudo-localization snapshot tests
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -testPlan PseudoLocalization
```

## Rules

1. Never hardcode user-facing strings in code — always use resource files.
2. Always use NSLocalizedString (iOS) or @string/ (Android) for all strings.
3. Never assume English-like plural rules — always use CLDR plural categories (zero, one, two, few, many, other).
4. Always use start/end instead of left/right for layout attributes (RTL support).
5. Never concatenate translated strings — use format specifiers and placeholders.
6. Always provide base locale (en) as the development language.
7. Never use images with embedded text — use separate localized asset catalogs.
8. Always support Dynamic Type/ font scaling per locale (different scripts need different sizes).
9. Never use string interpolation with positional arguments for non-English languages.
10. Always test with longest translation (German, Russian) to prevent truncation.
11. Never assume date format is MM/DD/YYYY — use locale-aware formatters.
12. Always set supportsRtl=true in AndroidManifest.xml.
13. Never use UIWebView language detection — use app-level locale management.
14. Always consider text direction in animations and gestures.
15. Never cache formatted strings — re-format when locale changes.
16. Always provide localized accessibility labels (VoiceOver, TalkBack).
17. Never use string keys as UI display text.
18. Always implement OTA localization updates for critical strings.
19. Never ignore pseudo-localization build warnings.
20. Always validate all languages when adding new translatable strings.

## References
  - references/android-localization.md — Android Localization
  - references/ios-localization.md — iOS Localization
  - references/l10n-workflow.md — Localization Workflow
  - references/mobile-localization-advanced.md — Mobile Localization Advanced Topics
  - references/mobile-localization-fundamentals.md — Mobile Localization Fundamentals
  - references/rtl-support.md — Right-to-Left (RTL) Support
## Handoff
- `mobile/mobile-widgets` — Widget localization and RTL support
- `backend/transactional-email` — Email template localization patterns
- `backend/sms-messaging` — Localized SMS/WhatsApp message templates
- `frontend/web-localization` — Shared locale strategy for web + mobile consistency
