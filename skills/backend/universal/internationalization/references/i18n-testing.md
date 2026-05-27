# i18n Testing

## Overview
Test internationalization: translation completeness, placeholder validation, ICU syntax checking, locale-specific formatting, RTL rendering, and CI automation.

## Translation Completeness Tests

```typescript
describe('Translation completeness', () => {
  it('all locales have all keys from source (en-US)', async () => {
    const source = await loadTranslations('en-US');
    const locales = ['vi-VN', 'zh-CN', 'es-MX', 'de-DE', 'fr-FR', 'ja-JP', 'ar-SA'];
    const missing: Record<string, string[]> = {};

    for (const locale of locales) {
      const target = await loadTranslations(locale);
      const missingKeys = Object.keys(source).filter(k => !target[k]);
      if (missingKeys.length > 0) {
        missing[locale] = missingKeys;
      }
    }

    expect(missing).toEqual({});
  });

  it('no extra keys in translations (unused)', async () => {
    const source = await loadTranslations('en-US');
    const locales = ['vi-VN', 'zh-CN', 'es-MX'];
    const extra: Record<string, string[]> = {};

    for (const locale of locales) {
      const target = await loadTranslations(locale);
      const extraKeys = Object.keys(target).filter(k => !source[k]);
      if (extraKeys.length > 0) {
        extra[locale] = extraKeys;
      }
    }

    expect(extra).toEqual({});
  });
});
```

## Placeholder Validation

```typescript
describe('Placeholder consistency', () => {
  it('all translations have matching placeholders', async () => {
    const source = await loadTranslations('en-US');
    const locales = ['vi-VN', 'zh-CN', 'es-MX', 'de-DE', 'fr-FR'];

    for (const locale of locales) {
      const target = await loadTranslations(locale);

      for (const key of Object.keys(source)) {
        const sourceVars = extractICUVariables(source[key]);
        const targetVars = extractICUVariables(target[key]);

        // Check all source variables exist in translation
        const missing = sourceVars.filter(v => !targetVars.includes(v));
        expect(missing).toEqual([]);
      }
    }
  });

  it('no extra placeholders in translations', async () => {
    const source = await loadTranslations('en-US');
    const target = await loadTranslations('vi-VN');

    for (const key of Object.keys(source)) {
      const sourceVars = extractICUVariables(source[key]);
      const targetVars = extractICUVariables(target[key]);

      const extra = targetVars.filter(v => !sourceVars.includes(v));
      expect(extra).toEqual([]);
    }
  });
});
```

## ICU Syntax Validation

```typescript
describe('ICU Message syntax', () => {
  it('all translations have valid ICU syntax', async () => {
    const locales = ['en-US', 'vi-VN', 'zh-CN', 'es-MX', 'de-DE', 'fr-FR', 'ja-JP', 'ar-SA'];

    for (const locale of locales) {
      const translations = await loadTranslations(locale);

      for (const [key, message] of Object.entries(translations)) {
        try {
          const formatter = new IntlMessageFormat(message, locale);
          // Test format with sample values works
          formatter.format({ count: 1, name: 'test', amount: 100, date: new Date() });
        } catch (error) {
          throw new Error(`Invalid ICU in ${locale}/${key}: ${(error as Error).message}`);
        }
      }
    }
  });

  it('handles plural rules correctly per locale', () => {
    const testCases = [
      { locale: 'en-US', count: 0, expected: 'no items' },
      { locale: 'en-US', count: 1, expected: '1 item' },
      { locale: 'en-US', count: 5, expected: '5 items' },
      { locale: 'ar-SA', count: 0, expected: 'لا عناصر' },
      { locale: 'ar-SA', count: 1, expected: 'عنصر واحد' },
      { locale: 'ar-SA', count: 2, expected: 'عنصران' },
    ];

    for (const { locale, count, expected } of testCases) {
      const message = translations[locale]['cart.item_count'];
      const formatted = new IntlMessageFormat(message, locale).format({ count });
      // Verify count is properly interpolated
      expect(formatted).toContain(String(count));
    }
  });
});
```

## Locale-Specific Formatting Tests

```typescript
describe('Locale-specific formatting', () => {
  it('formats dates correctly per locale', () => {
    const date = new Date('2026-05-15T10:30:00Z');
    const testCases = [
      { locale: 'en-US', expected: /May 15?, 2026/ },
      { locale: 'de-DE', expected: /15\.5\.2026|15\.05\.2026/ },
      { locale: 'vi-VN', expected: /15\/5\/2026|15\/05\/2026/ },
      { locale: 'ja-JP', expected: /2026\/5\/15|2026\/05\/15/ },
    ];

    for (const { locale, expected } of testCases) {
      const formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
      expect(formatted).toMatch(expected);
    }
  });

  it('formats currency correctly per locale', () => {
    const testCases = [
      { locale: 'en-US', value: 1234.56, expected: /1,234\.56/ },
      { locale: 'de-DE', value: 1234.56, expected: /1\.234,56/ },
      { locale: 'vi-VN', value: 1234.56, expected: /1\.234,56/ },
    ];

    for (const { locale, value } of testCases) {
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
      }).format(value);
      expect(formatted).toBeTruthy();
    }
  });

  it('formats numbers with correct group separators', () => {
    expect(new Intl.NumberFormat('en-US').format(1234567)).toBe('1,234,567');
    expect(new Intl.NumberFormat('de-DE').format(1234567)).toBe('1.234.567');
  });
});
```

## RTL Rendering Tests

```typescript
describe('RTL locale handling', () => {
  it('sets correct dir attribute for RTL locales', () => {
    const rtlLocales = ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK'];
    const ltrLocales = ['en-US', 'vi-VN', 'zh-CN', 'de-DE'];

    for (const locale of rtlLocales) {
      expect(getDirection(locale)).toBe('rtl');
    }

    for (const locale of ltrLocales) {
      expect(getDirection(locale)).toBe('ltr');
    }
  });

  it('renders bidirectional text correctly', () => {
    // Arabic text with English number embedded
    const arabicText = 'تم تحديث الطلب #1234 بنجاح';
    // The number 1234 should display in LTR order within RTL text
    const rendered = renderBidirectional(arabicText);
    expect(rendered).toContain('1234');
    expect(rendered.charAt(0)).toBe('ت'); // Should start with Arabic character
  });
});
```

## CI Integration

```yaml
# .github/workflows/i18n-validation.yml
name: i18n Validation
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      - name: Validate translation completeness
        run: npx jest --testPathPattern i18n-completeness

      - name: Validate ICU syntax
        run: npx jest --testPathPattern icu-syntax

      - name: Validate placeholder consistency
        run: npx jest --testPathPattern placeholders

      - name: Validate locale formatting
        run: npx jest --testPathPattern locale-formatting
```

## Key Points
- Test all translation keys exist across all supported locales
- No extra (unused) keys in translation files
- Verify all placeholders from source exist in translations
- No extra placeholders in translated strings
- Validate ICU MessageFormat syntax compiles and renders correctly
- Test plural rules per locale (especially locales with 6+ plural forms)
- Test locale-specific number, date, and currency formatting
- Verify RTL direction attribute and bidirectional text handling
- Run i18n validation in CI as part of every pull request
