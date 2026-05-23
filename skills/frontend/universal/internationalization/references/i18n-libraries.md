# i18n Libraries

## i18next

### Setup
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

i18n
  .use(Backend)           // lazy-load resources via HTTP
  .use(LanguageDetector)  // auto-detect user language
  .use(initReactI18next)  // bind to React
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: { escapeValue: false },
    ns: ['common', 'auth', 'errors'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n
```

### React Usage
```typescript
import { useTranslation } from 'react-i18next'

function Welcome() {
  const { t, i18n } = useTranslation()
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button onClick={() => i18n.changeLanguage('fr')}>Français</button>
    </div>
  )
}
```

### Trans Component for Rich HTML
```typescript
import { Trans } from 'react-i18next'

<Trans i18nKey="welcome.withLink">
  Welcome <strong>{{ name }}</strong>. Read the <a href="/docs">docs</a>.
</Trans>
```

### Key Features
- **Pluralization**: `t('key', { count })` with `key_one`, `key_other`, `key_zero`
- **Context**: `t('key', { context: 'male' })` → `key_male`
- **Nested keys**: `t('auth.form.submit')` → `{ auth: { form: { submit: "Sign in" } } }`
- **Interpolation**: `t('greeting', { name: 'Alice' })`
- **Formatting**: `t('date', { date: new Date(), formatParams: { date: { year: 'numeric', month: 'long' } } })`
- **Lazy namespaces**: `useTranslation('auth')` loads `auth` namespace on demand

## react-intl (FormatJS)

### Setup
```typescript
import { IntlProvider } from 'react-intl'
import messages from './locales/en.json'

function App() {
  const [locale, setLocale] = useState('en')
  const localeMessages = loadMessages(locale)

  return (
    <IntlProvider locale={locale} messages={localeMessages} defaultLocale="en">
      <MainApp />
    </IntlProvider>
  )
}
```

### Usage
```typescript
import { FormattedMessage, FormattedNumber, FormattedDate, FormattedRelativeTime, useIntl } from 'react-intl'

function Invoice() {
  const { formatMessage } = useIntl()

  return (
    <div>
      <FormattedMessage defaultMessage="Invoice {invoiceId}" values={{ invoiceId: 'INV-001' }} />
      <FormattedNumber value={1234.56} style="currency" currency="USD" />
      <FormattedDate value={new Date()} dateStyle="long" />
      <FormattedRelativeTime value={-5} unit="minute" />
    </div>
  )
}
```

### ICU Message Syntax
```
{name} took {numPhotos, plural,
  =0 {no photos}
  =1 {one photo}
  other {# photos}
} on {tripDate, date, long}.
```

Supported: `{variable}`, `{count, plural, =0 {...} other {...}}`, `{gender, select, male {...} female {...} other {...}}`, `{value, number, ::currency/USD}`, `{value, date, long}`.

## vue-i18n

### Setup (Vue 3)
```typescript
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, fr },
  numberFormats: {
    en: { currency: { style: 'currency', currency: 'USD' } },
  },
  dateTimeFormats: {
    en: { long: { year: 'numeric', month: 'long', day: 'numeric' } },
  },
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

### Usage
```vue
<template>
  <p>{{ $t('auth.welcome', { name: user.name }) }}</p>
  <p>{{ $n(price, 'currency') }}</p>
  <p>{{ $d(new Date(), 'long') }}</p>
  <i18n-t keypath="terms.notice" tag="p">
    <a href="/terms">{{ $t('terms.link') }}</a>
  </i18n-t>
  <select v-model="$i18n.locale">
    <option value="en">English</option>
    <option value="fr">Français</option>
  </select>
</template>
```

### Composition API
```typescript
import { useI18n } from 'vue-i18n'

const { t, locale, availableLocales } = useI18n()
```

## Angular i18n (@angular/localize)

Build-time extraction: `ng extract-i18n` creates `messages.xlf`. Each locale is a separate build: `ng build --localize`. Runtime switching requires reload to a different locale build. Not suitable for dynamic locale switching without custom setup.

## Library Selection Guide

| Need | Best Pick |
|------|-----------|
| Cross-framework | i18next |
| React + ICU syntax | react-intl |
| Vue 3 | vue-i18n |
| Angular | @angular/localize |
| Svelte | svelte-i18n |
| Fast / low bundle | FormatJS subset |
| SSR (Next.js) | next-i18next / react-i18next |
| SSR (Nuxt) | @nuxtjs/i18n |
| SSR (SvelteKit) | svelte-i18n |

## Lazy Loading Pattern

```typescript
// i18next with http backend auto-loads
// Manual load:
async function loadLocale(locale: string) {
  const resources = await Promise.all([
    import(`./locales/${locale}/common.json`),
    import(`./locales/${locale}/auth.json`),
  ])
  i18n.addResourceBundle(locale, 'common', resources[0])
  i18n.addResourceBundle(locale, 'auth', resources[1])
}
```

## Performance

- Use `Trans` / `<FormattedMessage>` for static text, `t()` / `formatMessage` for dynamic values
- Split translation files by namespace, not by page — avoids duplicate loading
- Pre-compile ICU messages in production builds with `@formatjs/cli`
- Tree-shake unused locales with dynamic imports + webpack chunking
- Set `debug: false` in production to suppress console output
- Use `i18n.languages` vs `i18n.language` to handle fallback chain
