---
name: frontend-internationalization
description: >
  Use this skill when the user says 'i18n', 'internationalization', 'localization', 'locale switching', 'RTL', 'right-to-left', 'i18next', 'react-intl', 'vue-i18n', 'translation', 'language selector', 'formatjs', 'ICU message format', 'pluralization', 'LTR', 'bidirectional text'. This skill enforces proper i18n library selection, locale switching patterns, RTL/LTR layout support, ICU message syntax, and translation file management. Works with any frontend framework (React, Vue, Angular, Svelte). Do NOT use for: backend i18n, database collation, or content translation workflows.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, i18n, internationalization, universal]
---

# Frontend Internationalization (i18n)

## Purpose
Deliver multi-locale frontends with proper locale detection, resource loading, ICU message formatting, pluralization, date/number formatting, and full RTL layout support. The right library is chosen per framework. Translation files are kept separate from application logic.

## Agent Protocol

### Trigger
Exact phrases: "i18n", "internationalization", "localization", "locale switching", "RTL", "i18next", "react-intl", "vue-i18n", "translation", "language selector", "formatjs", "pluralization", "bidirectional text", "locale detection".

### Input Context
- Framework (React, Vue, Angular, Svelte, vanilla)
- Locales required (e.g., en, fr, ar, he)
- Existing i18n library or preference
- SSR vs client-only rendering
- Dynamic vs build-time locale loading
- RTL support needed

### Output Artifact
Complete i18n setup: library config, resource structure, locale switching mechanism, RTL styles, and usage patterns.

### Response Format
```
## Strategy
<library, locale-loading, RTL-approach>

## Setup
<config, resource-imports>

## Usage
<components, hooks, format-patterns>

## RTL
<layout-switch, css-logical-properties>

—
Compression footer: frontend-i18n/v1 | locales: <count> | lib: <selected> | rtl: <bool>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Locale resources loaded (dynamic or static) without affecting TTFB
- [ ] Locale switching works without full page reload
- [ ] ICU message format used for pluralization and interpolation
- [ ] Dates, numbers, currencies formatted per locale
- [ ] RTL layout switches correctly with CSS logical properties
- [ ] Language direction attribute updates on the `<html>` element
- [ ] Translation key fallback chain configured (locale → fallback locale)
- [ ] SSR locale detection sends correct language to client

### Max Response Length
4096 tokens

## i18n Architecture / Decision Trees

### Library Selection Decision Tree
```
Framework?
  |-- React -->
  |     SSR needed?
  |     |-- YES: next-i18next (Next.js) or react-i18next (any)
  |     |-- NO: react-i18next (full featured) or react-intl (ICU, smaller bundle)
  |
  |-- Vue -->
  |     |-- Vue 3: vue-i18n (official)
  |     |-- Nuxt: @nuxtjs/i18n
  |
  |-- Angular -->
  |     |-- @angular/localize (official, compile-time)
  |     |-- ngx-translate (runtime)
  |
  |-- Svelte -->
  |     |-- svelte-i18n or sveltekit-i18n
  |
  |-- Cross-framework / monorepo -->
        |-- i18next (framework-agnostic adapter)
```

### Locale Loading Decision Tree
```
Number of locales?
  |-- 2-3 locales, small files (<50KB total) -->
  |     Bundle all translations? If yes: Include in main bundle (no loading delay)
  |     If no: Lazy load on locale switch
  |
  |-- 4-10 locales, moderate files -->
  |     Lazy-load per locale on demand. Split by namespace (common, auth, admin).
  |     Cache loaded resources in memory.
  |
  |-- 10+ locales -->
  |     Lazy-load per locale, per namespace. Only load active locale.
  |     Consider CDN-hosted translation files to reduce initial bundle.
  |
  |-- SSR application -->
        Load locale server-side, serialize to client via inline script.
        Hydrate client with server-loaded resources (no double fetch).
```

### RTL Strategy Decision Tree
```
RTL support needed?
  |-- YES -->
  |     CSS approach?
  |     |-- Use CSS logical properties (inline-start/end) throughout
  |     |-- Set dir="rtl" on <html> element on locale change
  |     |-- Verify: all margin-left/right, padding-left/right, text-align left/right are replaced
  |     |
  |     Testing?
  |     |-- Visual: toggle locale to RTL, check every page
  |     |-- Automated: screenshot tests with RTL locale
  |
  |-- NO -->
        Ensure CSS logical properties are used anyway (future-proof).
```

---

## Workflow

### 1. Library Selection
| Framework | Library | Notes |
|-----------|---------|-------|
| React | react-i18next (i18next) | Most mature, full feature set |
| React | react-intl (FormatJS) | ICU message syntax, smaller bundle |
| Vue 2/3 | vue-i18n | Official Vue i18n solution |
| Angular | @angular/localize | Built-in Angular i18n |
| Svelte | svelte-i18n | Lightweight, reactive |
| Vanilla | i18next | Framework-agnostic |

Prefer i18next for cross-framework projects or when full feature set is needed. Prefer FormatJS for React projects that need ICU message syntax and smaller bundle size.

### 2. Resource Structure
```
locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   └── errors.json
├── fr/
│   ├── common.json
│   ├── auth.json
│   └── errors.json
└── ar/
    ├── common.json
    ├── auth.json
    └── errors.json
```
Namespaced translation files. Lazy-load namespaces on demand. Each namespace is a flat JSON file with dot-separated keys.

### 3. Locale Detection & Persistence
```typescript
// Priority: URL > localStorage > cookie > navigator.language > fallback
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n.use(LanguageDetector).init({
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
  },
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})
```

### 4. Translation Usage
```typescript
// Key-based translation with interpolation
t('auth.welcome', { name: 'Alice' })
// → "Welcome, Alice!"

// Pluralization
t('common.items', { count: items.length })
// count=0 → "No items"
// count=1 → "1 item"
// count=5 → "5 items"

// With context
t('common.status', { context: status })
// status='online' → "User is online"
// status='offline' → "User is offline"
```

### 5. ICU Message Format (FormatJS)
```typescript
import { FormattedMessage, useIntl } from 'react-intl'

// Component
<FormattedMessage
  defaultMessage="{name} has {numPhotos, plural, =0 {no photos} =1 {one photo} other {# photos}}"
  values={{ name: 'Alice', numPhotos: 3 }}
/>

// Hook
const { formatMessage } = useIntl()
formatMessage({ defaultMessage: 'Hello {name}' }, { name: 'Bob' })
```

### 6. RTL Support
```typescript
// Detect direction from locale
const isRTL = ['ar', 'he', 'fa', 'ur'].includes(locale)
document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
document.documentElement.lang = locale
```

Prefer CSS logical properties over hardcoded left/right:
```css
/* NOT THIS */
.sidebar { margin-left: 16px; text-align: left; }

/* THIS */
.sidebar { margin-inline-start: 16px; text-align: start; }
```

Logical properties automatically flip in RTL mode: `margin-inline-start` → right margin in RTL, `padding-inline-end` → left padding in RTL, `border-inline-start` → right border in RTL, `inset-inline-start` → right positioning in RTL.

### 7. Date & Number Formatting
```typescript
// i18next
new Date().toLocaleDateString(locale, { dateStyle: 'long' })
new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount)

// FormatJS
import { FormattedDate, FormattedNumber } from 'react-intl'

<FormattedDate value={date} dateStyle="long" />
<FormattedNumber value={price} style="currency" currency="USD" />
<FormattedNumber value={0.9} style="percent" />
```

### 8. SSR Locale Detection
```typescript
// Next.js i18n (simpler approach — use middleware)
// Or accept-language header parsing
import acceptLanguage from 'accept-language'
acceptLanguage.languages(['en', 'fr', 'ar'])

export function getLocaleFromHeaders(request: Request): string {
  const acceptLang = request.headers.get('accept-language') || ''
  return acceptLanguage.parse(acceptLang)[0] || 'en'
}
```

### 9. Lazy Loading
```typescript
i18n.use(initReactI18next).init({
  resources: {}, // start empty
  partialBundledLanguages: true,
})

// Load namespace on demand
async function loadNamespace(locale: string, ns: string) {
  const resources = await import(`./locales/${locale}/${ns}.json`)
  i18n.addResourceBundle(locale, ns, resources)
}
```

### 10. Testing with i18n
```typescript
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n-test-config' // test-only config

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}
```

### 11. Locale-Specific Number Formatting
```typescript
const formatters = {
  currency: (locale: string, amount: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount),
  percent: (locale: string, value: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value),
  unit: (locale: string, value: number, unit: string) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit }).format(value),
}

// Usage
formatters.currency('de-DE', 19.99, 'EUR') // "19,99 €"
formatters.percent('en-US', 0.25)           // "25%"
```

## Common Pitfalls

### 1. Hardcoded Strings in Components
```typescript
// BAD -- hardcoded string, cannot be translated
<h2>Welcome back, {name}!</h2>

// GOOD -- translatable key
<h2>{t('auth.welcomeBack', { name })}</h2>
```

### 2. CSS left/right Instead of Logical Properties
Using `left`/`right` properties requires overriding every rule for RTL. CSS logical properties (`inline-start`/`inline-end`) flip automatically.

### 3. Not Persisting User Locale Choice
Detecting locale from `navigator.language` alone loses the user's choice after they switch. Always persist to localStorage or user preferences API.

### 4. Bundling All Locales
Importing all translation files in the main bundle increases initial JS size by 100KB+ per additional locale. Lazy-load by locale and namespace.

### 5. Missing Pluralization Rules
Some languages have complex plural rules (Arabic has 6 forms, Polish has 3). ICU handles this automatically — but only if you use proper plural syntax.

### 6. No Fallback Chain
When a translation key is missing in the target locale, the app should fall back to the default locale, then to the key itself. Without this, users see empty strings.

## Compared With

| Feature | i18next | FormatJS | vue-i18n | @angular/localize |
|---------|---------|----------|----------|-------------------|
| ICU message format | Plugin | Native | Built-in | Built-in |
| Pluralization | Built-in | Built-in | Built-in | Built-in |
| Lazy loading | Built-in | Manual | Manual | Build-time |
| SSR support | Yes | Yes | Yes (Nuxt) | Build-time |
| TypeScript support | Good | Good | Good | Built-in |
| Bundle size | ~10KB | ~5KB | ~6KB | 0KB (compile-time) |
| Framework agnostic | Yes | React only | Vue only | Angular only |

## Performance Considerations

### Bundle Impact
- Including i18next: ~10KB gzipped
- Lazy-loaded locale resources per language: 2-20KB gzipped depending on app size
- All 10 locales bundled eagerly: +100KB+ to initial JS
- With lazy loading: only active locale loaded, ~2-20KB

### SSR Serialization Cost
Serializing translation resources to the client adds ~5-50KB to the initial HTML payload. For large apps, consider streaming or loading only the current page's namespace.

### RTL CSS Cost
CSS logical properties have negligible performance cost. Flipping layout on locale change triggers a full layout recalculation (style recalc + layout pass), typically taking 10-50ms.

## Accessibility Considerations

- `dir` and `lang` attributes on `<html>` are required for screen readers
- RTL text must use the correct Unicode bidirectional characters
- Icons with directional meaning (arrows, chevrons) should flip in RTL mode
- Translation text may be longer in some languages — allow for text expansion (30-50% longer in German, Arabic)
- Form labels and button text must be translated, not just content

## Security Considerations

- Never interpolate user input directly into translated strings (XSS risk)
- i18next escapes values by default — do not disable `escapeValue`
- Translation files from user-generated content (crowdsourced) must be sanitized
- Avoid using `dangerouslySetInnerHTML` with translated content

## Rules
1. Never embed user-facing strings directly in components — always use translation keys.
2. Translation keys follow a namespaced dot notation: `namespace.key.subkey`.
3. Use ICU message format for pluralization, select, and ordinal rules.
4. Never use CSS `left`/`right` properties — use CSS logical properties (`inline-start`/`inline-end`).
5. HTML dir attribute and lang attribute are always in sync with current locale.
6. Lazy-load translation files — never bundle all locales in the main chunk.
7. Fallback chain always configured: target locale → fallback locale → key itself.
8. Locale detection never relies solely on browser `navigator.language` — persist user choice.
9. Numbers, dates, and currencies are formatted with `Intl` — never hardcoded.
10. Translation interpolation escapes HTML by default to prevent XSS.

## References
  - references/i18n-build-optimization.md — i18n Build Optimization
  - references/i18n-implementation.md — i18n Implementation
  - references/i18n-libraries.md — i18n Libraries
  - references/i18n-testing.md — i18n Testing
  - references/i18n-workflow.md — i18n Workflow
  - references/rtl-support.md — RTL Support
## Handoff
No artifact produced unless requested.
Next skill: `frontend-accessibility` — RTL a11y overlaps with i18n, pass locale direction config.
Carry forward: locale list, RTL requirement, i18n library, lazy loading strategy.
