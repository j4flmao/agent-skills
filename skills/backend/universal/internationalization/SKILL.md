---
name: backend-internationalization
description: >
  Use this skill when implementing multi-language support, translation workflows, or locale-aware formatting. This skill enforces: BCP 47 locale tags, ICU MessageFormat for complex messages, dot-separated namespaced keys, fallback chains, and CI-validated translation files. Applies to any backend stack serving multi-region users. Do NOT use for: simple string key-value without plural/gender, or single-language applications.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, i18n, phase-6, universal]
---

# Backend Internationalization

## Purpose
Design i18n architecture with locale selection, translation workflow, and message formatting.

## Agent Protocol

### Trigger
Exact user phrases: "i18n", "internationalization", "localization", "l10n", "translation", "multi-language", "locale", "language support", "translation file", "gettext", "message format", "ICU message", "pluralization", "RTL support".

### Input Context
Before activating, verify:
- Initial languages to support and priority order
- Translation workflow (in-house translators, vendor, Crowdin/Lokalise)
- Content types needing translation (API messages, emails, push notifications, error messages)
- Who provides translations (developers, product team, translation service)

### Output Artifact
Internationalization architecture design as formatted text.

### Response Format
```yaml
# Locale configuration with fallback chains
# Translation file structure
```
```typescript
// Message formatting code
// Locale detection and negotiation
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Locale selection with BCP 47 tags and fallback chains
- [ ] Message storage with ICU MessageFormat and key naming convention
- [ ] Translation workflow defined (extract → translate → import → validate)
- [ ] API message delivery with Accept-Language parsing and Content-Language header
- [ ] Server-side locale-aware formatting (date, number, currency, timezone)
- [ ] RTL support with dir attribute and bidirectional text handling

### Max Response Length
200 lines of configuration and code.

## Decision Tree

### Which Library?

```
What tech stack and i18n needs?
  ├── Node.js, need ICU support, flexible
  │   └── i18next (most popular, rich ecosystem)
  ├── React, need ICU, date/number formatting
  │   └── FormatJS / react-intl (ICU native, Intl API integration)
  ├── Python / Django
  │   └── Babel + gettext (PO files, Django integration)
  ├── Python, need ICU
  │   └── Babel with babel-icu extension
  ├── Go
  │   └── go-i18n (ICU-like, YAML/TOML/JSON)
  └── Java / Spring
      └── ResourceBundle + ICU4J (standard Java i18n)
```

### How to Detect Locale?

```
Where does the user's locale come from?
  ├── Browser sends Accept-Language header
  │   └── Parse q-value, negotiate against supported list
  ├── User has saved preference in profile
  │   └── Use profile locale, ignore Accept-Language
  ├── Domain or subdomain (fr.example.com)
  │   └── Map domain to locale
  ├── GeoIP (approximate location)
  │   └── Use as default only — never override user preference
  └── Authenticated API → JWT contains locale claim
      └── Extract from token, fast-path locale resolution
```

## Workflow

### Step 1: Library Selection
| Library | Language | Message Format | Pluralization | ICU Native | Framework |
|---------|----------|---------------|---------------|------------|-----------|
| i18next | JS/TS | JSON | 6 forms | Via plugin | Universal |
| FormatJS | JS/TS | ICU | Built-in | Yes | React |
| gettext | Multi | PO/MO | 4 forms | Limited | Python/PHP |
| Fluent (Project Fluent) | Multi | FTL | Unlimited | Yes | Mozilla |
| Babel | Python | PO | 4 forms | Via babel-icu | Django |

Choose based on: ICU support requirements, framework integration, pluralization rules complexity (some languages have 6+ plural forms), and runtime performance. i18next is most popular for Node.js, FormatJS for React, gettext for Python/Django, Fluent for Mozilla projects.

### Step 2: Locale Selection and Detection
Use BCP 47 tags: `en-US`, `vi-VN`, `zh-CN`, `de-DE`, `fr-FR`, `ja-JP`, `ar-SA`. Define fallback chain per language: `es-MX` → `es-ES` → `es` → `en-US`. Store supported locales in configuration. Detect user locale from: `Accept-Language` header (q-value parsing), user profile preference (database), geolocation (CloudFront CloudFront-Viewer-Country header), domain/subdomain (`fr.example.com`). Never guess locale from IP alone — always respect user preference.

```typescript
function negotiateLocale(acceptLanguage: string): string {
  const supported = ['en-US', 'vi-VN', 'zh-CN', 'es-MX', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ar-SA'];
  const fallbacks: Record<string, string> = { 'es-MX': 'es-ES', 'es-ES': 'es', 'es': 'en-US' };
  const parsed = acceptLanguage.split(',')
    .map(s => { const [tag, q = 'q=1'] = s.trim().split(';'); return { tag: tag.trim(), q: parseFloat(q.split('=')[1] || '1') }; })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of parsed) {
    if (supported.includes(tag)) return tag;
    const base = tag.split('-')[0];
    if (supported.includes(base)) return base;
    if (fallbacks[tag]) return fallbacks[tag];
  }
  return 'en-US';
}
```

### Step 3: Message Storage and ICU MessageFormat
Use ICU MessageFormat for all user-facing strings — supports pluralization, gender, select, and number/date formatting. Organize translation files as JSON per locale per domain: `locales/en-US/common.json`. Key naming convention: `{domain}.{context}.{key}` — e.g., `checkout.error.card_declined`, `email.welcome.subject`. One domain per logical feature area. Shared keys in `common.json`.

```json
{
  "checkout.error.card_declined": "Your card was declined. {reason, select, insufficient_funds {Insufficient funds.} expired {Card expired.} fraud {Transaction flagged.} other {Please try another method.}}",
  "cart.item_count": "You have {count, plural, =0 {no items} one {# item} other {# items}} in your cart.",
  "invoice.total": "Total: {amount, number, ::currency/USD}",
  "email.greeting": "Hello {name}, your order {orderId} was shipped on {date, date, medium}.",
  "notification.new_follower": "{gender, select, male {He} female {She} other {They}} started following you.",
  "search.ordinal_result": "You are in {n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place."
}
```

ICU MessageFormat patterns reference: `{value, date, medium}` — date formatting. `{value, number, ::currency/USD}` — currency. `{value, number, ::percent}` — percentage. `{count, plural, =0 {none} one {# item} other {# items}}` — pluralization. `{gender, select, male {He} female {She} other {They}}` — gender selection. `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}` — ordinal numbering.

### Step 4: Translation Workflow
Extract: CLI scans source code for `t()`/`__()` calls and outputs key catalog as JSON with context and file location. Upload: push key catalog to translation platform (Crowdin, Lokalise, POEditor) via REST API. Translate: translators work in platform UI with context strings, screenshots, and descriptions. Review: translation reviewers validate accuracy and consistency. Download: pull translated files as locale JSON. CI validates: every PR checks all keys present, no missing placeholders, ICU syntax valid. Build: bundle translation files with application or lazy-load at runtime.

```bash
# Extract keys with i18next-scanner
npx i18next-scanner --config i18next-scanner.config.js

# Push to Crowdin
crowdin upload sources --branch main

# Pull translations (after translators complete)
crowdin download --branch main --skip-untranslated-strings false
```

```typescript
// CI validation script
async function validateTranslations(): Promise<boolean> {
  const source = await loadLocale('en-US');
  const locales = ['vi-VN', 'zh-CN', 'es-MX', 'de-DE', 'fr-FR', 'ja-JP', 'ar-SA'];
  let valid = true;
  for (const locale of locales) {
    const target = await loadLocale(locale);
    for (const key of Object.keys(source)) {
      if (!target[key]) { console.error(`Missing key "${key}" in ${locale}`); valid = false; continue; }
      const sourceArgs = extractICUVars(source[key]);
      const targetArgs = extractICUVars(target[key]);
      if (JSON.stringify(sourceArgs.sort()) !== JSON.stringify(targetArgs.sort())) {
        console.error(`Argument mismatch for "${key}" in ${locale}: expected ${sourceArgs}, got ${targetArgs}`);
        valid = false;
      }
    }
  }
  return valid;
}
```

### Step 5: API Message Delivery
Parse `Accept-Language` header using quality factor (q-value). Negotiate best matching locale from supported set. Set `Content-Language` response header to the negotiated locale. Translate error messages on server side — never send raw keys to client. For emails/push: use user's stored locale preference. Cache loaded translation files in memory with LRU (max 50 locales, bound memory). For server-rendered pages, negotiate locale per request.

```typescript
// Express middleware
app.use((req, res, next) => {
  const locale = negotiateLocale(req.headers['accept-language'] || 'en-US');
  req.locale = locale;
  req.t = (key: string, params?: Record<string, unknown>) => i18next.t(key, { lng: locale, ...params });
  res.setHeader('Content-Language', locale);
  next();
});

// Error handler with translated messages
app.use((err: Error, req: Request, res: Response) => {
  const message = req.t('error.generic_server_error', { errorId: req.id });
  res.status(500).json({ error: message, errorId: req.id });
});
```

### Step 6: Locale-Aware Formatting
Use ICU for all formatting: `{value, date, medium}`, `{value, number, ::currency/USD}`, `{value, number, ::percent}`. Timezone: store UTC in DB, convert to user timezone at render time. Number formats differ: `1,234.56` vs `1.234,56`. Use `Intl.DateTimeFormat`, `Intl.NumberFormat` server-side. Never concatenate translated strings with dynamic values — always use placeholders.

| Format | en-US | de-DE | vi-VN | fr-FR | ja-JP |
|--------|-------|-------|-------|-------|-------|
| Date | Jan 15, 2025 | 15.01.2025 | 15/01/2025 | 15 janv. 2025 | 2025/01/15 |
| Time | 10:30 AM | 10:30 | 10:30 | 10:30 | 10:30 |
| Number | 1,234.56 | 1.234,56 | 1.234,56 | 1 234,56 | 1,234.56 |
| Currency | $1,234.56 | 1.234,56 € | 1.234,56 ₫ | 1 234,56 € | ¥1,235 |

### Step 7: RTL Support
RTL locales: `ar`, `ar-SA`, `he`, `he-IL`, `fa`, `fa-IR`, `ur`, `ur-PK`. Set `dir="rtl"` attribute in HTML/email response. Handle bidirectional text (BiDi) with Unicode bidi algorithm (UBA). Wrap LTR text in RTL context with Unicode characters: `\u202B` (RTL Embed), `\u202C` (Pop Directional Formatting). Use logical CSS properties: `margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`.

### Step 8: Pluralization Rules by Language

| Language | Plural Forms | Example |
|----------|-------------|---------|
| English | 2 (singular, plural) | 1 item, 5 items |
| Russian | 4 (one, few, many, other) | 1, 2-4, 5-20, 21 |
| Arabic | 6 (zero, one, two, few, many, other) | 0, 1, 2, 3-10, 11-99, 100+ |
| Japanese | 1 (other) | All numbers use same form |
| Chinese | 1 (other) | All numbers use same form |

### Step 9: Pseudo-Localization for Testing

```typescript
// Pseudo-localization: expand strings to find layout issues
function pseudoLocalize(enText: string): string {
  return `[${enText.split('').map(c => {
    const map: Record<string, string> = { 'a': 'α', 'e': 'ε', 'o': 'σ', 'i': 'ι' };
    return map[c.toLowerCase()] || c;
  }).join('')}!!!]`;
}
```

## Lazy Loading Strategy

```typescript
const translationCache = new Map<string, Record<string, string>>();

async function loadLocale(locale: string, namespace = 'common'): Promise<Record<string, string>> {
  const key = `${locale}:${namespace}`;
  if (translationCache.has(key)) return translationCache.get(key)!;
  const response = await fetch(`/locales/${locale}/${namespace}.json`);
  const data = await response.json();
  translationCache.set(key, data);
  return data;
}
```

## Configuration Reference

```yaml
i18n:
  defaultLocale: en-US
  supportedLocales: [en-US, vi-VN, zh-CN, es-MX, es-ES, de-DE, fr-FR, ja-JP, ar-SA]
  rtlLocales: [ar-SA, he-IL, fa-IR, ur-PK]
  fallbackStrategy: exact -> parent -> default -> key
  namespaces: [common, checkout, email, error, notification]
  cache:
    type: lru
    maxSize: 50
    ttlMs: 3600000
  lazyLoad: true
  pseudoLocalization: false
  ci:
    validatePlaceholders: true
    validateSyntax: true
    requireAllKeys: true
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Translation file size | Split by namespace. Namespace per feature. Lazy-load on first use |
| Missing translations | Fallback chain: exact → parent → default → key name returned |
| Performance | Cache translations in-memory. LRU with TTL |
| CDN for translation files | Serve locale JSON from CDN with versioned URLs |
| Translation coverage | CI fails if coverage < 80% of source keys |
| Context for translators | Every key has description, max length hint, and screenshot |

## Security

| Risk | Mitigation |
|------|-----------|
| Injection via translation | ICU MessageFormat supports code execution in some parsers — always validate/sanitize |
| Missing placeholders | CI validates argument matching between source and target locales |
| RTL override injection | Sanitize user-generated content in RTL contexts (Unicode bidi overrides) |
| Excessive locale loading | Rate-limit locale file requests, cache aggressively |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| English-only keys as fallback (e.g., `checkout.error.card_declined` returns `"checkout.error.card_declined"`) | Confusing for users | Fallback to default locale (en-US) translation, not the key |
| String concatenation | Breaks in RTL, wrong word order | Use placeholders: `Hello {name}` not `"Hello " + name` |
| Large monolithic translation files | Slow to load, hard to maintain | Split by namespace per feature |
| No ICU for plurals | Wrong grammar in many languages | Use ICU plural syntax |
| Client-side only i18n | SEO fails, server errors not translated | Translate on server for SSR and API errors |
| Inline strings mixed with code | Impossible to extract for translators | All strings in translation files, none in code |

## Rules
- Locale = BCP 47 tag. Never language-only (`en` not `english`)
- Keys are dot-separated and namespaced
- ICU MessageFormat for all user-facing strings
- Fallback chain: exact locale → parent locale → default locale → key itself
- Translation files are version-controlled and CI-validated
- Every string has a description for translators
- No concatenation of translated strings — use placeholders
- Store timestamps in UTC, format at render time
- RTL languages require `dir="rtl"` attribute and BiDi handling
- Never translate error messages at client — always translate server-side
- Extract translation strings as CI step, never manually maintain key lists

## References
  - references/i18n-architecture.md — Internationalization Architecture
  - references/i18n-frontend.md — Frontend Internationalization
  - references/i18n-libraries.md — i18n Libraries
  - references/i18n-performance.md — i18n Performance
  - references/i18n-testing.md — i18n Testing
  - references/l10n-patterns.md — L10n Patterns
  - references/rtl-i18n.md — RTL and Complex Scripts Reference
  - references/translation-workflow.md — Translation Workflow Reference
## Handoff
`frontend-universal/animation` for RTL UI considerations and animation direction
