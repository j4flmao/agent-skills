---
name: backend-internationalization
description: >
  Use this skill when implementing multi-language support, translation workflows, or locale-aware formatting. This skill enforces: BCP 47 locale tags, ICU MessageFormat for complex messages, dot-separated namespaced keys, fallback chains, and CI-validated translation files. Applies to any backend stack serving multi-region users. Do NOT use for: simple string key-value without plural/gender, or single-language applications.
version: "1.0.0"
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

## Workflow

### Step 1: Locale Selection
Use BCP 47 tags: `en-US`, `vi-VN`, `zh-CN`, `de-DE`, `fr-FR`, `ja-JP`. Define fallback chain per language: `es-MX` → `es-ES` → `es` → `en`. Store supported locales in configuration. Detect user locale from: `Accept-Language` header, user profile preference, geolocation (CloudFront/Cloudflare headers). Never guess locale from IP alone — always respect user preference.

### Step 2: Message Storage
Use ICU MessageFormat for all user-facing strings — supports pluralization, gender, select, and number formatting. Organize translation files as JSON/YAML per locale: `locales/en-US/common.json`. Key naming convention: `{domain}.{context}.{key}` — e.g., `checkout.error.card_declined`, `email.welcome.subject`. One domain per logical feature area. Shared keys in `common.json`.

### Step 3: Translation Workflow
Extract: CLI scans source code for `t()`/`__()` calls and outputs key catalog. Upload: push key catalog to translation platform (Crowdin, Lokalise, POEditor). Translate: translators work in platform UI or via vendor. Download: pull translated files as locale JSON/YAML. CI validates: every PR checks that all keys have translations, no missing placeholders, ICU syntax is valid. Build: bundle translation files with application.

### Step 4: API Message Delivery
Parse `Accept-Language` header using quality factor (q-value). Negotiate best matching locale from supported set. Set `Content-Language` response header to the negotiated locale. Translate error messages on the server side — never send raw keys to client. For emails/push: use user's stored locale preference. Cache loaded translation files in memory with lazy loading per locale.

### Step 5: Locale-Aware Formatting
Use ICU for all formatting: `{value, date, medium}`, `{value, number, ::currency/USD}`, `{value, number, ::percent}`. Timezone conversion: store and render in user's timezone, always store in UTC in database. Use `Intl` APIs server-side (Node.js Intl, Java Locale, Python Babel). Never concatenate translated strings with dynamic values — always use placeholders.

### Step 6: RTL Support
Detect RTL languages: `ar`, `he`, `fa`, `ur`. Set `dir="rtl"` attribute in HTML/email response. Handle bidirectional text with Unicode bidi algorithm (UBA). Mirror layout in responses where applicable. Use logical properties (start/end instead of left/right) in CSS.

## Rules
- Locale = BCP 47 tag. Never language-only (`en` not `english`)
- Keys are dot-separated and namespaced
- ICU MessageFormat for all user-facing strings
- Fallback chain: exact locale → parent locale → default locale → key itself
- Translation files are version-controlled and CI-validated
- Every string has a description for translators
- No concatenation of translated strings — use placeholders

## References
- `references/i18n-architecture.md` — Locale selection, ICU format, translation workflow, API design
- `references/l10n-workflow.md` — Key extraction, translation platforms, CI integration, QA

## Handoff
`frontend-universal/animation` for RTL UI considerations and animation direction
