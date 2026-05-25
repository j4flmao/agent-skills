# i18n Implementation

## i18next Setup

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

i18n
  .use(Backend)           // load translations via HTTP
  .use(LanguageDetector)  // detect user language
  .use(initReactI18next)  // react integration
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,  // React already escapes
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    ns: ['common', 'auth', 'errors'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
  })

export default i18n
```

## Translation File Format

```json
{
  "welcome": "Welcome, {{name}}!",
  "items": "{{count}} item",
  "items_plural": "{{count}} items",
  "itemsWithCount_zero": "No items",
  "itemsWithCount_one": "{{count}} item",
  "itemsWithCount_other": "{{count}} items",
  "status_online": "User is online",
  "status_offline": "User is offline",
  "nested": {
    "key": "Nested value"
  }
}
```

## ICU Message Format (FormatJS)

```tsx
import { FormattedMessage, FormattedDate, FormattedNumber, FormattedRelativeTime } from 'react-intl'

function Invoice({ invoice }: { invoice: Invoice }) {
  return (
    <div>
      <FormattedMessage
        defaultMessage="Invoice {invoiceNumber} for {amount, number, USD}"
        values={{ invoiceNumber: invoice.id, amount: invoice.total }}
      />
      <br />
      <FormattedDate value={invoice.date} dateStyle="long" />
      <br />
      <FormattedRelativeTime value={-5} unit="minute" />
      <br />
      <FormattedMessage
        defaultMessage="{count, plural, =0 {No items} one {# item} other {# items}}"
        values={{ count: invoice.lineItems.length }}
      />
    </div>
  )
}
```

## Locale Switching

```typescript
function useLocaleSwitch() {
  const { i18n } = useTranslation()

  const switchLocale = useCallback(async (locale: string) => {
    await i18n.changeLanguage(locale)

    // Update document direction
    const isRTL = ['ar', 'he', 'fa', 'ur'].includes(locale)
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = locale

    // Save preference
    localStorage.setItem('locale', locale)
  }, [i18n])

  return { locale: i18n.language, switchLocale, dir: document.documentElement.dir }
}

function LanguageSwitcher() {
  const { locale, switchLocale } = useLocaleSwitch()

  return (
    <select value={locale} onChange={(e) => switchLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="ar">العربية</option>
      <option value="ja">日本語</option>
    </select>
  )
}
```

## Namespace Loading

```typescript
// Lazy-load namespace when component mounts
function AdminPanel() {
  const { i18n } = useTranslation()

  useEffect(() => {
    if (!i18n.hasResourceBundle(i18n.language, 'admin')) {
      i18n.loadNamespaces('admin')
    }
  }, [i18n])

  return <Translation>{(t) => <div>{t('admin.title')}</div>}</Translation>
}
```

## SSR with i18n (Next.js)

```typescript
// next-i18next.config.js
const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'ar', 'ja'],
    localeDetection: true,
  },
  localePath: path.resolve('./public/locales'),
}

// pages/_app.tsx
import { appWithTranslation } from 'next-i18next'
import nextI18NextConfig from '../next-i18next.config'

function App({ Component, pageProps }) {
  return (
    <Component {...pageProps} />
  )
}

export default appWithTranslation(App, nextI18NextConfig)
```

## Locale Files Management

```
locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── dashboard.json
│   └── errors.json
├── fr/
│   ├── common.json
│   ├── auth.json
│   ├── dashboard.json
│   └── errors.json
└── index.ts              // re-export all for type safety
```

## Translation Key Conventions

| Convention | Example | Rationale |
|------------|---------|-----------|
| Dot notation | `auth.login.title` | Hierarchical, easy to read |
| Namespaces | Separate files per domain | Lazy loading, parallel translation |
| Parameters | `welcome {{name}}` | Interpolation for dynamic content |
| Plural key | `items_zero`, `items_one`, `items_other` | i18next pluralization |
| Context suffix | `status_online`, `status_offline` | Context-based variants |
| Consistent casing | All lowercase keys | Case-insensitive matching |

## Type-Safe Translation Keys

```typescript
// Generate types from translation files
type LocaleKey = {
  [K in keyof typeof en]: {
    [J in keyof typeof en[K]]: `${K}.${J}`
  }[keyof typeof en[K]]
}[keyof typeof en]

// Type-safe t function
function typedT(key: LocaleKey, options?: Record<string, unknown>): string {
  return i18n.t(key, options)
}
```
