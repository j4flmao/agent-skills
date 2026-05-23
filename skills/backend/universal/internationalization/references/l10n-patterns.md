# L10n Patterns

## Translation File Structure

```
locales/
  en-US/
    common.json          → Shared UI strings (buttons, labels, placeholders)
    checkout.json        → Checkout flow (cart, payment, shipping)
    email.json           → Email templates (welcome, receipt, reset password)
    error.json           → Error messages (validation, API errors, 404/500)
    notification.json    → Push notification messages
  vi-VN/
    common.json
    checkout.json
    email.json
    error.json
    notification.json
  zh-CN/
    ...
  keys.json              → Source keys with descriptions (auto-generated)
```

## Key Naming Convention

```
{domain}.{context}.{key}

email.welcome.subject        → "Welcome to our platform!"
email.welcome.body           → "Hi {name}, thanks for joining..."
checkout.error.invalid_coupon → "Coupon code {code} is invalid or expired."
checkout.button.place_order  → "Place Order"
user.profile.name_label      → "Full Name"
user.profile.email_label     → "Email Address"
validation.required          → "{field} is required"
validation.min_length        → "{field} must be at least {min} characters"
notification.order_shipped   → "Your order {orderId} has shipped!"
```

## Key Extraction Pipeline

```bash
# i18next-scanner config (i18next-scanner.config.js)
module.exports = {
  input: ['src/**/*.{ts,tsx,js,jsx}'],
  output: './locales',
  options: {
    func: { list: ['t', 'i18next.t'] },
    lngs: ['en-US'],
    ns: ['common', 'checkout', 'email', 'error'],
    defaultLng: 'en-US',
    defaultNs: 'common',
    resource: { loadPath: 'locales/{{lng}}/{{ns}}.json', savePath: 'locales/{{lng}}/{{ns}}.json' },
  },
};
```

```bash
# Run extraction
npx i18next-scanner --config i18next-scanner.config.js
```

## Translation Platform API Integration

```typescript
// Crowdin API: upload source files
async function uploadSources() {
  const response = await fetch('https://api.crowdin.com/api/v2/projects/{projectId}/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CROWDIN_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storageId: await uploadStorage(),
      name: 'en-US/common.json',
      directoryId: 42,
    }),
  });
  return response.json();
}

// Download translations
async function downloadTranslations(locale: string) {
  const response = await fetch(
    `https://api.crowdin.com/api/v2/projects/{projectId}/translations/builds`,
    { method: 'POST', headers: { Authorization: `Bearer ${process.env.CROWDIN_TOKEN}` } }
  );
  const { id } = await response.json();
  // Poll for build completion, then download
}
```

## CI Validation Rules

```yaml
ci_validation:
  rules:
    - rule: "All keys present in all locales"
      check: "For each key in en-US, verify key exists in all target locales"
    - rule: "No missing ICU arguments"
      check: "Parse ICU messages, verify {arg} set in source == {arg} set in translation"
    - rule: "Valid ICU syntax"
      check: "Parse each message with ICU parser — fail on syntax error"
    - rule: "No empty translations"
      check: "Translation value is non-empty string"
    - rule: "HTML tag parity"
      check: "If source contains <b>, <a>, etc., translation contains same tags (no more, no less)"
    - rule: "Placeholder count match"
      check: "{variable} count matches between source and translation"
```

```typescript
// GitHub Actions: i18n validation
async function validateTranslations(): Promise<boolean> {
  const source = await loadLocale('en-US');
  const locales = ['vi-VN', 'zh-CN', 'es-MX', 'de-DE'];
  let valid = true;
  for (const locale of locales) {
    const target = await loadLocale(locale);
    for (const [key, value] of Object.entries(source)) {
      if (!target[key]) {
        console.error(`Missing key "${key}" in ${locale}`);
        valid = false;
        continue;
      }
      const sourceArgs = extractICUVars(value);
      const targetArgs = extractICUVars(target[key]);
      if (JSON.stringify(sourceArgs.sort()) !== JSON.stringify(targetArgs.sort())) {
        console.error(`Argument mismatch for "${key}" in ${locale}: ${JSON.stringify(targetArgs)} vs ${JSON.stringify(sourceArgs)}`);
        valid = false;
      }
    }
  }
  return valid;
}
```

## Pseudo-Localization

Pseudo-localization replaces each character with an accented/extended variant to reveal UI layout issues before real translations arrive.

```typescript
function pseudoLocalize(text: string): string {
  const map: Record<string, string> = {
    'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú',
    'A': 'Á', 'E': 'É', 'I': 'Í', 'O': 'Ó', 'U': 'Ú',
    'c': 'ç', 'n': 'ñ', 's': 'ß',
  };
  const transformed = text.split('').map(c => map[c] || c).join('');
  return `[!!! ${transformed} !!!]`; // prefix/suffix reveals truncation
}
```

## RTL Handling

```yaml
rtl_locales: ["ar", "ar-SA", "he", "he-IL", "fa", "fa-IR", "ur", "ur-PK"]
```

Detect RTL by checking locale against known RTL list. Set `dir="rtl"` on root HTML element. Handle bidirectional (BiDi) text: when LTR text (e.g., "Hello") appears inside RTL context, wrap with Unicode bidi characters: `\u202B` (RTL embed) and `\u202C` (pop directional formatting). Use logical CSS properties: `margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`.

## Lazy Loading Strategy

```typescript
// Lazy load translation files per locale
const translationCache = new Map<string, Record<string, string>>();
const loadingPromises = new Map<string, Promise<void>>();

async function loadLocale(locale: string): Promise<Record<string, string>> {
  if (translationCache.has(locale)) return translationCache.get(locale)!;
  if (!loadingPromises.has(locale)) {
    loadingPromises.set(locale, (async () => {
      const response = await fetch(`/locales/${locale}/common.json`);
      const data = await response.json();
      translationCache.set(locale, data);
    })());
  }
  await loadingPromises.get(locale)!;
  return translationCache.get(locale)!;
}
```

## QA Checklist

- [ ] Translations render without ICU errors across all locales
- [ ] Plural forms exist for all required languages
- [ ] Date/number/currency formats match locale conventions
- [ ] RTL pages render correctly with proper text direction
- [ ] No text truncation in UI (test with longest translation)
- [ ] Special characters display correctly (Unicode range)
- [ ] All dynamic placeholders render with correct values
- [ ] Email templates render correctly with localization applied
- [ ] Translate source strings BEFORE development (i18n-first)
- [ ] Fallback chain works: missing es-MX → es-ES → es → en-US → key
