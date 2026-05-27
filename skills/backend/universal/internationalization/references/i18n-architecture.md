# Internationalization Architecture

## Translation File Structure

### File Organization
```
locales/
├── en/
│   ├── common.json
│   ├── errors.json
│   ├── validation.json
│   ├── emails.json
│   ├── notifications.json
│   └── invoices.json
├── es/
│   ├── common.json
│   ├── errors.json
│   └── ...
├── fr/
│   └── ...
├── de/
│   └── ...
├── ja/
│   └── ...
├── zh-CN/
│   └── ...
└── index.ts
```

### Translation JSON Format
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Are you sure?",
    "loading": "Loading...",
    "empty": "No items found",
    "pagination": {
      "page": "Page {page} of {total}",
      "showing": "Showing {start}-{end} of {total}",
      "perPage": "Items per page"
    }
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "notFound": "The requested resource was not found.",
    "unauthorized": "You do not have permission to perform this action.",
    "rateLimited": "Too many requests. Please wait before trying again.",
    "validation": {
      "required": "{field} is required",
      "minLength": "{field} must be at least {min} characters",
      "maxLength": "{field} must be at most {max} characters",
      "email": "Invalid email address",
      "invalidFormat": "Invalid format for {field}"
    }
  }
}
```

## Backend Implementation

### Node.js/TypeScript Setup
```typescript
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja', 'zh-CN'],
    ns: ['common', 'errors', 'validation', 'emails', 'notifications'],
    defaultNS: 'common',
    backend: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['header', 'query', 'cookie'],
      lookupHeader: 'accept-language',
      lookupQuery: 'lang',
      lookupCookie: 'i18next',
      caches: ['cookie'],
    },
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
  });

export default i18next;
```

### Express Integration
```typescript
import express from 'express';
import middleware from 'i18next-http-middleware';

const app = express();

app.use(middleware.handle(i18next));

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({
      error: req.t('errors.validation.required', { field: 'Name' }),
    });
  }

  if (!email?.includes('@')) {
    return res.status(400).json({
      error: req.t('errors.validation.email'),
    });
  }

  res.json({ message: req.t('common.save', { context: 'success' }) });
});
```

### Python/FastAPI Setup
```python
from fastapi import Request
from fastapi.responses import JSONResponse
import gettext
import os

class I18nManager:
    def __init__(self, locales_dir: str, default_locale: str = "en"):
        self.locales_dir = locales_dir
        self.default_locale = default_locale
        self.translations = {}
        self._load_translations()

    def _load_translations(self):
        for locale in os.listdir(self.locales_dir):
            locale_path = os.path.join(self.locales_dir, locale)
            if os.path.isdir(locale_path):
                lang = gettext.translation(
                    "messages",
                    localedir=self.locales_dir,
                    languages=[locale],
                    fallback=True
                )
                self.translations[locale] = lang

    def get_locale(self, request: Request) -> str:
        accept_language = request.headers.get("accept-language", "")
        if accept_language:
            for lang in accept_language.split(","):
                locale = lang.split(";")[0].strip()[:2]
                if locale in self.translations:
                    return locale
        return self.default_locale

    def translate(self, key: str, locale: str, **kwargs) -> str:
        translation = self.translations.get(locale, self.translations[self.default_locale])
        message = translation.gettext(key)
        if kwargs:
            message = message.format(**kwargs)
        return message
```

### Java/Spring Setup
```java
@Configuration
public class I18nConfig implements WebMvcConfigurer {

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(Locale.US);
        resolver.setSupportedLocales(Arrays.asList(
            Locale.US, Locale.UK, new Locale("es"), new Locale("fr"),
            new Locale("de"), new Locale("ja"), Locale.SIMPLIFIED_CHINESE
        ));
        return resolver;
    }

    @Bean
    public ResourceBundleMessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setUseCodeAsDefaultMessage(true);
        source.setFallbackToSystemLocale(false);
        return source;
    }
}
```

## Date, Time, and Number Formatting

### Internationalized Formatting
```typescript
import { format, formatDistance } from 'date-fns';
import { enUS, es, fr, de, ja, zhCN } from 'date-fns/locale';

const localeMap = {
  en: enUS,
  es,
  fr,
  de,
  ja,
  'zh-CN': zhCN,
};

function formatDate(date: Date, locale: string, pattern = 'PPP') {
  return format(date, pattern, {
    locale: localeMap[locale] || localeMap.en,
  });
}

function formatRelative(date: Date, base: Date, locale: string) {
  return formatDistance(date, base, {
    locale: localeMap[locale] || localeMap.en,
    addSuffix: true,
  });
}

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatNumber(number: number, locale: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(number);
}
```

## Pluralization Rules

```json
{
  "items": {
    "zero": "No items",
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

```typescript
i18next.init({
  resources: {
    en: {
      translation: {
        items: "{{count}} items",
        items_plural: "{{count}} items",
        items_zero: "No items",
      },
    },
    ar: {
      translation: {
        items: "{{count}} عنصر",
        items_plural: "{{count}} عناصر",
        items_zero: "لا توجد عناصر",
        items_two: "{{count}} عنصرين",
        items_few: "{{count}} عناصر",
        items_many: "{{count}} عنصرًا",
      },
    },
  },
  pluralSeparator: "_",
  // Arabic has 6 plural forms
});

function getItemCount(count: number, locale: string): string {
  return i18next.t('items', { count, lng: locale });
}
```

## Locale Detection

```typescript
function detectLocale(request: Request): string {
  const supportedLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh-CN', 'ar', 'pt-BR'];

  const query = request.query.lang as string;
  if (query && supportedLocales.includes(query)) return query;

  const cookie = request.cookies?.locale;
  if (cookie && supportedLocales.includes(cookie)) return cookie;

  const acceptLanguage = request.headers['accept-language'];
  if (acceptLanguage) {
    for (const lang of acceptLanguage.split(',')) {
      const locale = lang.split(';')[0].trim();
      if (supportedLocales.includes(locale)) return locale;
      const baseLocale = locale.split('-')[0];
      if (supportedLocales.includes(baseLocale)) return baseLocale;
    }
  }

  return 'en';
}
```

## Key Points
- Organize translations by namespace (common, errors, emails) for modular loading
- Support locale detection via Accept-Language header, query param, and cookie
- Use ICU MessageFormat for complex pluralization rules across languages
- Format dates, numbers, and currencies using locale-aware APIs (Intl, date-fns)
- Store translations as JSON files with a fallback chain to default locale
- Implement server-side locale resolution for API responses
- Cache translations in memory to avoid repeated file reads
- Support right-to-left (RTL) languages with appropriate CSS and layout
- Test translations with placeholder substitution to catch missing keys
- Use translation management platforms (Crowdin, Lokalise) for team workflows
