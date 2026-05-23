# i18n Libraries

## Library Comparison Matrix

| Feature | i18next | FormatJS | gettext | Fluent | Babel (Python) |
|---------|---------|----------|---------|--------|----------------|
| Language | JS/TS | JS/TS | Multi | Multi | Python |
| ICU MessageFormat | Via plugin | Native | Limited | Native (FTL) | Via plugin |
| Plural forms | 6 forms | 6 forms | 4 forms | Unlimited | 4 forms |
| Nesting | Yes | Yes | No | Yes | No |
| Interpolation | Yes | Yes | Via printf | Yes | %s/%d |
| Lazy loading | Built-in | Manual | Manual | Manual | Manual |
| RTL detection | Plugin | Manual | Manual | Manual | Manual |
| Framework | Universal | React-focused | Python/PHP | Mozilla | Django |
| Bundle size | ~7KB gzip | ~5KB gzip | ~15KB | ~20KB | N/A (server) |
| Context support | Yes | Via ICU | Via msgctxt | Yes | Via pgettext |

## i18next Configuration

```typescript
import i18next from 'i18next';
import ICU from 'i18next-icu';
import Backend from 'i18next-fs-backend';

await i18next
  .use(ICU)
  .use(Backend)
  .init({
    fallbackLng: 'en-US',
    supportedLngs: ['en-US', 'vi-VN', 'zh-CN', 'es-MX', 'es-ES', 'de-DE', 'fr-FR', 'ja-JP'],
    ns: ['common', 'checkout', 'email', 'error'],
    defaultNS: 'common',
    backend: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
    },
    interpolation: { escapeValue: false },
    returnObjects: true,
    parseMissingKeyHandler: (key: string) => {
      console.warn(`Missing translation: ${key}`);
      return key;
    },
  });

// Usage
function t(key: string, params?: Record<string, unknown>, locale?: string) {
  return i18next.t(key, { ...params, lng: locale });
}
```

## FormatJS Configuration

```typescript
import { createIntl, createIntlCache } from '@formatjs/intl';

const cache = createIntlCache();
const intlMap = new Map<string, ReturnType<typeof createIntl>>();

function getIntl(locale: string) {
  if (!intlMap.has(locale)) {
    const messages = require(`./locales/${locale}.json`);
    intlMap.set(locale, createIntl({ locale, messages }, cache));
  }
  return intlMap.get(locale)!;
}

function t(key: string, params?: Record<string, unknown>, locale = 'en-US') {
  return getIntl(locale).formatMessage({ id: key }, params);
}
```

## gettext Configuration

```python
# Python gettext example
import gettext
import os

translations = {}

def get_translation(locale: str):
    if locale not in translations:
        locale_path = os.path.join('locales', locale, 'LC_MESSAGES')
        translations[locale] = gettext.translation('messages', locale_path, [locale], fallback=True)
    return translations[locale]

def t(key: str, locale: str = 'en_US'):
    trans = get_translation(locale)
    return trans.gettext(key)
```

## ICU MessageFormat Reference

| Pattern | Example | Output |
|---------|---------|--------|
| Simple | `Hello {name}` | Hello Alice |
| Plural | `{count, plural, one {# item} other {# items}}` | 1 item / 3 items |
| Select | `{gender, select, male {He} female {She} other {They}}` | He / She / They |
| Number | `{value, number}` | 1,234.56 |
| Currency | `{value, number, ::currency/USD}` | $1,234.56 |
| Percent | `{value, number, ::percent}` | 12.3% |
| Date | `{date, date, medium}` | Jan 15, 2025 |
| Time | `{time, time, short}` | 10:30 AM |
| Ordinal | `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}` | 1st / 2nd / 3rd / 4th |

## Locale Configuration Schema

```yaml
locales:
  en-US: { fallback: null, name: "English (US)", rtl: false }
  vi-VN: { fallback: null, name: "Tiếng Việt", rtl: false }
  zh-CN: { fallback: null, name: "简体中文", rtl: false }
  ar-SA: { fallback: null, name: "العربية", rtl: true }
  es-MX: { fallback: es-ES, name: "Español (MX)", rtl: false }
  es-ES: { fallback: es, name: "Español (ES)", rtl: false }
  es: { fallback: en-US, name: "Español", rtl: false }
  he-IL: { fallback: null, name: "עברית", rtl: true }
default: en-US
fallbackStrategy: "exact -> parent -> default -> key"
```

## Number Formatting by Locale

| Locale | Decimal | Group | Currency | Example |
|--------|---------|-------|----------|---------|
| en-US | `.` | `,` | $ | $1,234.56 |
| de-DE | `,` | `.` | € | 1.234,56 € |
| vi-VN | `,` | `.` | ₫ | 1.234,56 ₫ |
| fr-FR | `,` | ` ` | € | 1 234,56 € |
| ja-JP | `.` | `,` | ¥ | ¥1,234.56 |

## Common Pitfalls

- **Locale-dependent sorting**: Alphabetical order differs per locale (collation). Use locale-aware sorting with `Intl.Collator`.
- **Case conversion**: Upper/lowercase rules differ (Turkish `i` → `İ`). Use `Intl.Locale`-aware case conversion.
- **Timezone mismatches**: Store all timestamps in UTC. Convert to user timezone only at render time. Never store user-local time.
- **Embedded HTML in translations**: HTML tags in translated strings are fragile. Use structured message formats with components as variables instead of inline HTML.
- **Missing ICU context**: ICU select/plural arguments differ between source and translations. CI must validate that all ICU arguments present in source also exist in every translation.
