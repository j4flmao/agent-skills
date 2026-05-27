# Frontend Internationalization

## React i18n Integration

### Setup with react-i18next
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja', 'zh-CN', 'ar', 'pt-BR'],
    ns: ['common', 'errors', 'features'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });
```

### Custom Hook for Translation
```typescript
import { useTranslation } from 'react-i18next';

function useLocale() {
  const { t, i18n } = useTranslation();

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = i18n.dir(lng);
  };

  const currentLocale = i18n.language;
  const isRTL = i18n.dir() === 'rtl';

  return { t, currentLocale, changeLanguage, isRTL };
}
```

### Component Usage
```typescript
import { useTranslation, Trans } from 'react-i18next';

function WelcomeMessage({ user }) {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcome', { name: user.name })}</h1>
      <p>
        <Trans i18nKey="welcome.description" values={{ appName: 'MyApp' }}>
          Welcome to <strong>MyApp</strong>. We're glad to have you!
        </Trans>
      </p>
      <span>{t('items', { count: user.items.length })}</span>
    </div>
  );
}
```

### Language Switcher Component
```typescript
import { useLocale } from './useLocale';

const languages = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'ja', label: '日本語', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

function LanguageSwitcher() {
  const { currentLocale, changeLanguage } = useLocale();

  return (
    <select
      value={currentLocale}
      onChange={(e) => changeLanguage(e.target.value)}
      aria-label="Select language"
    >
      {languages.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
```

## Vue i18n Integration

### Vue 3 Setup
```typescript
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      message: {
        hello: 'Hello {name}!',
        items: 'No items | 1 item | {count} items',
        login: {
          title: 'Sign In',
          submit: 'Log in',
          forgotPassword: 'Forgot password?',
        },
      },
    },
    es: {
      message: {
        hello: '¡Hola {name}!',
        items: 'Sin elementos | 1 elemento | {count} elementos',
        login: {
          title: 'Iniciar Sesión',
          submit: 'Iniciar sesión',
          forgotPassword: '¿Olvidaste tu contraseña?',
        },
      },
    },
  },
});

const app = createApp(App);
app.use(i18n);
app.mount('#app');
```

### Component Usage
```html
<template>
  <div>
    <h1>{{ $t('message.hello', { name: user.name }) }}</h1>
    <p>{{ $tc('message.items', user.items.length) }}</p>

    <form>
      <h2>{{ $t('message.login.title') }}</h2>
      <input :placeholder="$t('message.login.submit')" />
      <a href="#">{{ $t('message.login.forgotPassword') }}</a>
    </form>

    <select v-model="$i18n.locale">
      <option v-for="locale in locales" :key="locale.code" :value="locale.code">
        {{ locale.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
const locales = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];
</script>
```

## RTL Support

### CSS with Logical Properties
```css
/* Use logical properties for RTL compatibility */
.container {
  padding-inline: 16px;
  margin-inline-end: 8px;
  border-inline-start: 2px solid currentColor;
  text-align: start;
}

/* Override only when necessary */
[dir="rtl"] .icon-arrow {
  transform: scaleX(-1);
}

/* Floating and positioning */
[dir="rtl"] .sidebar {
  right: auto;
  left: 0;
}
```

### JavaScript Helpers
```typescript
function getDirectionalValue(ltrValue: string, rtlValue: string, isRTL: boolean): string {
  return isRTL ? rtlValue : ltrValue;
}

function getTextAlign(isRTL: boolean): string {
  return isRTL ? 'right' : 'left';
}

// For animations
function getSlideDirection(isRTL: boolean): string {
  return isRTL ? 'left' : 'right';
}
```

## Date and Number Formatting

### Intl API Usage
```typescript
function formatDateForLocale(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatCurrencyForLocale(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  }).format(amount);
}

function formatRelativeTime(date: Date, locale: string): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absDiff < 60000) return rtf.format(Math.round(diff / 1000), 'second');
  if (absDiff < 3600000) return rtf.format(Math.round(diff / 60000), 'minute');
  if (absDiff < 86400000) return rtf.format(Math.round(diff / 3600000), 'hour');
  if (absDiff < 2592000000) return rtf.format(Math.round(diff / 86400000), 'day');
  return rtf.format(Math.round(diff / 2592000000), 'month');
}
```

## Lazy Loading Translations

```typescript
import i18n from 'i18next';

async function loadNamespace(lng: string, ns: string) {
  if (i18n.hasResourceBundle(lng, ns)) return;

  const response = await fetch(`/locales/${lng}/${ns}.json`);
  const resources = await response.json();
  i18n.addResourceBundle(lng, ns, resources);
}

// Pre-load on route change
router.beforeEach(async (to, from, next) => {
  const locale = i18n.language;
  const ns = to.meta.namespace || 'common';
  await loadNamespace(locale, ns);
  next();
});
```

## Key Points
- Integrate i18n libraries (react-i18next, vue-i18n) at the app root level
- Detect user locale automatically from browser settings with persistence
- Support RTL languages with logical CSS properties and directional utilities
- Use Intl API for locale-aware date, number, and currency formatting
- Implement language switcher with proper accessibility attributes
- Lazy load translation files to reduce initial bundle size
- Use Trans/Translation components for rich text with embedded HTML
- Store user language preference in localStorage for persistence
- Set html lang and dir attributes on language change
- Test all components with multiple locales including RTL languages
