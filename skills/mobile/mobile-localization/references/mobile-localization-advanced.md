# Mobile Localization Advanced Topics

## Overview
Advanced mobile localization covers pseudolocalization automation, dynamic locale switching without app restart, pluralization for complex languages, bidirectional text handling, and automated translation pipeline integration.

## Dynamic Locale Switching

### In-App Language Change
iOS: `UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)` to direct to system settings. Advanced: override `Bundle` swizzling to change app language at runtime (not App Store compliant). Preferred: restart UI with `rootViewController` swap and new locale.

Android: `LocaleManager.setOverrideLocale` (API 33+). `createConfigurationContext(locale)` for per-activity override. Store selected locale in SharedPreferences. Recreate Activity or restart app. `AppCompatDelegate.setApplicationLocales` for AppCompat-based override.

Flutter/Riverpod: `localeProvider` state. Pass locale to `MaterialApp(locale: locale)`. Rebuild widget tree on locale change. Persist selection in SharedPreferences.

### Locale-Parametrized URLs
Deep links that include language: `myapp.com/en/orders/123`. Parse language from URL path, apply locale, navigate to content. Useful for sharing across languages. SEO benefit for web versions. Must gracefully handle unsupported locale redirect.

## Advanced Pluralization

### Arabic Plural Rules
Arabic has 6 plural forms: zero, one, two, few, many, other.
```
{count, plural,
    zero {لا توجد طلبات}
    one {طلب واحد}
    two {طلبان}
    few {{count} طلبات}
    many {{count} طلباً}
    other {{count} طلب}
}
```

### Russian/Polish Plural Rules
Russian: one (1, 21, 31), few (2-4, 22-24), many (0, 5-20, 25-30), other. Polish uses similar but different boundaries. ICU handles these automatically when correct plural rules are in the translation.

### Gender-Specific Translations
Some languages (Hebrew, Arabic, French) require gender agreement. `{gender, select, male {...} female {...} other {...}}`.
```
"{name} {gender, select, male {joined} female {joined} other {joined}} the group."
```
Gender passed as a parameter from the app. Requires both the localized string and the gender context at call site.

## RTL Advanced Patterns

### Mixed Text Direction
Arabic or Hebrew text containing English numbers/embeds creates bidirectional text. Control with Unicode bidi markers: LRM (U+200E), RLM (U+200F). iOS: `NSTextAlignment.natural` for auto-direction. Android: `textDirection="anyRtl"`. HTML/CSS: `dir="auto"`.

### RTL-Specific Images
Flippable images (arrows, progress indicators) mirror in RTL. `autoMirrored` attribute in Android vector drawables. iOS: `imageFlippedForRightToLeftLayoutDirection()`. Flutter: `Directionality` widget for child auto-direction. Test with actual RTL content.

### Layout Mirroring
iOS: `UISemanticContentAttribute.forceRightToLeft` on views. Android: `android:supportsRtl="true"` with `start`/`end` layout attributes. Flutter: `Directionality` inherited widget wrapping RTL content. Test layout mirroring for every localized string length.

## Translation Pipeline Automation

### CI/CD Integration
Extract source strings on each PR build: `flutter gen-l10n` (Flutter), `extract_l10n.sh` (iOS), Gradle task (Android). Upload to TMS API (Lokalise/POEditor). Download translations in CI. Fail build if untranslated strings exceed threshold (e.g., 5% missing).

### Machine Translation
Machine translate on CI for development/staging (DeepL, Google Translate). Flag MT-translated strings with comment. Human review required before release. DOM comparison for translation quality. Auto-translate 24h after source string change for faster iteration.

### Pseudo-Localization in CI
Run pseudo-localization on every build to catch layout issues before human translation. Add 50% character expansion by repeating vowels. Replace ASCII chars with Unicode lookalikes. Add RTL markers to test bidi. Capture screenshots and diff against baseline.

## Testing

### Automated Screenshot Testing
Take screenshots in every supported locale. Use snapshot testing tools (iOS snapshot test, Paparazzi, golden toolkit). Diff against reference screenshots per locale. Approve visual changes in a review process. Run on CI with locale matrix.

### Locale-Specific Device Testing
Regional device differences: Chinese Android devices have no Google Play Services. Japanese phones use different numeric formats (kanji). Indian locale uses comma-separated numbers differently (lakh/crore). Test with actual device locales, not just language preference.

### Production Monitoring
Track locale distribution in analytics. Monitor crash rate by locale (locale-specific bugs). Detect untranslated strings appearing in production. Alert when locale coverage drops below 95%. A/B test locale-specific UI changes.

## Key Points
- In-app language switching: override Locale, recreate UI (iOS Bundle swizzle risky)
- 6 Arabic plural forms require complete translations
- Gender agreement needed for Hebrew, Arabic, French, Slavic languages
- Bidi markers (LRM/RLM) for mixed RTL/LTR text
- Test with actual RTL content and device locale
- Auto-mirror images for RTL (arrows, progress, icons)
- CI pipeline: extract → translate (MT) → pseudo-localize → screenshot diff
- Machine translation for dev/staging; human review for release
- Monitor locale coverage and crash rate per locale
- Lakh/crore number system for Indian locales
