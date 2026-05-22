# i18n Architecture

## Locale Configuration
```yaml
locales:
  en-US: { fallback: null, name: "English (US)" }
  vi-VN: { fallback: null, name: "Tiếng Việt" }
  zh-CN: { fallback: null, name: "简体中文" }
  es-MX: { fallback: es-ES, name: "Español (MX)" }
  es-ES: { fallback: es, name: "Español (ES)" }
  es: { fallback: en-US, name: "Español" }
default: en-US
```

## ICU MessageFormat
```
checkout.error.card_declined:
  "Your card was declined. {reason, select,
    insufficient_funds {Insufficient funds.}
    expired {Card expired.}
    fraud {Transaction flagged.}
    other {Please try a different payment method.}
  }"

cart.item_count:
  "You have {count, plural,
    =0 {no items}
    one {# item}
    other {# items}
  } in your cart."
```

## Key Naming Convention
```
{domain}.{context}.{key}
email.welcome.subject
email.welcome.body
checkout.error.invalid_coupon
checkout.error.card_declined
user.profile.name_label
user.profile.email_label
```

## Translation File Structure
```
locales/
  en-US/
    common.json         → shared UI strings
    checkout.json       → checkout flow strings
    email.json          → email templates
    error.json          → error messages
  vi-VN/
    common.json
    checkout.json
    email.json
    error.json
```

## API Negotiation
```typescript
function negotiateLocale(acceptLanguage: string): string {
  const parsed = parse(acceptLanguage); // q-value parsing
  for (const lang of parsed) {
    if (supported.has(lang.code)) return lang.code;
    const base = lang.code.split('-')[0];
    if (supported.has(base)) return base;
  }
  return 'en-US';
}
```
