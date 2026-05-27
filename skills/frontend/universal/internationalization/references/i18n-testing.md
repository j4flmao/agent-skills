# i18n Testing

## Test Setup Utilities

```typescript
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const TEST_RESOURCES = {
  en: {
    common: {
      greeting: 'Hello',
      farewell: 'Goodbye',
      welcome: 'Welcome, {{name}}!',
      items: '{{count}} item',
      items_plural: '{{count}} items',
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email',
    },
    nav: {
      home: 'Home',
      about: 'About Us',
      contact: 'Contact',
    },
  },
  es: {
    common: {
      greeting: 'Hola',
      farewell: 'Adiós',
      welcome: '¡Bienvenido, {{name}}!',
      items: '{{count}} artículo',
      items_plural: '{{count}} artículos',
    },
    errors: {
      required: 'Este campo es obligatorio',
      invalidEmail: 'Por favor ingrese un correo válido',
    },
    nav: {
      home: 'Inicio',
      about: 'Sobre Nosotros',
      contact: 'Contacto',
    },
  },
  fr: {
    common: {
      greeting: 'Bonjour',
      farewell: 'Au revoir',
      welcome: 'Bienvenue, {{name}}!',
      items: '{{count}} article',
      items_plural: '{{count}} articles',
    },
  },
}

function setupI18nTest(language = 'en', namespace = 'common') {
  const instance = i18n.createInstance()
  instance.use(initReactI18next).init({
    resources: TEST_RESOURCES,
    lng: language,
    fallbackLng: 'en',
    ns: [namespace],
    defaultNS: namespace,
    interpolation: {
      escapeValue: false,
    },
  })
  return instance
}

function renderWithI18n(
  ui: React.ReactElement,
  { language = 'en', ns = 'common' } = {}
) {
  const i18nInstance = setupI18nTest(language, ns)

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nextProvider i18n={i18nInstance}>
        {children}
      </I18nextProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper }),
    i18n: i18nInstance,
  }
}
```

## Translation Key Testing

```typescript
describe('Translation Keys', () => {
  it('all keys exist in all locales', () => {
    const locales = ['en', 'es', 'fr', 'de', 'ja']
    const namespaces = ['common', 'errors', 'nav', 'settings']

    const enKeys = extractAllKeys(TEST_RESOURCES.en)

    for (const locale of locales) {
      if (!TEST_RESOURCES[locale]) {
        console.warn(`Missing locale: ${locale}`)
        continue
      }

      for (const ns of namespaces) {
        const localeNs = TEST_RESOURCES[locale]?.[ns]
        if (!localeNs) {
          console.warn(`Missing namespace "${ns}" for locale "${locale}"`)
          continue
        }

        const localeKeys = extractAllKeys(localeNs)
        const missingKeys = enKeys.filter(k => !localeKeys.includes(k))

        expect(missingKeys).toEqual([])
      }
    }
  })

  it('does not have orphaned keys (present in locale but not in source)', () => {
    const enKeys = extractAllKeys(TEST_RESOURCES.en)
    const esKeys = extractAllKeys(TEST_RESOURCES.es)

    const orphanedKeys = esKeys.filter(k => !enKeys.includes(k))
    expect(orphanedKeys).toEqual([])
  })

  it('interpolation variables are consistent across locales', () => {
    const variables = extractVariables(TEST_RESOURCES.en.common)
    const esVariables = extractVariables(TEST_RESOURCES.es.common)

    for (const [key, vars] of Object.entries(variables)) {
      if (TEST_RESOURCES.es.common[key]) {
        expect(extractVariables({ [key]: TEST_RESOURCES.es.common[key] })[key])
          .toEqual(vars)
      }
    }
  })
})

function extractAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      return extractAllKeys(value as Record<string, unknown>, fullKey)
    }
    return [fullKey]
  })
}

function extractVariables(obj: Record<string, string>): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const varPattern = /{{(\w+)}}/g

  for (const [key, value] of Object.entries(obj)) {
    const vars: string[] = []
    let match
    while ((match = varPattern.exec(value)) !== null) {
      vars.push(match[1])
    }
    result[key] = vars
  }

  return result
}
```

## Plurals Testing

```typescript
describe('Pluralization Rules', () => {
  const supportedLocales = ['en', 'es', 'fr', 'de', 'ja', 'ar', 'pl', 'ru']

  it.each(supportedLocales)('handles plural forms for %s', (locale) => {
    const i18n = setupI18nTest(locale)
    const pluralFn = i18n.services.pluralResolver.getRule(locale)

    expect(pluralFn).toBeDefined()

    const testCounts = [0, 1, 2, 3, 5, 10, 100]
    for (const count of testCounts) {
      const form = pluralFn(count)
      const result = i18n.t('items', { count })
      expect(result).toBeTruthy()
      expect(result).not.toEqual('items')
    }
  })

  it('uses correct plural forms for different counts', () => {
    const i18n = setupI18nTest('en')

    expect(i18n.t('items', { count: 1 })).toBe('1 item')
    expect(i18n.t('items', { count: 2 })).toBe('2 items')
    expect(i18n.t('items', { count: 0 })).toBe('0 items')
  })
})
```

## Locale Switching Test

```typescript
describe('Locale Switching', () => {
  it('switches language and updates UI', async () => {
    const user = userEvent.setup()
    const { getByText, i18n } = renderWithI18n(<Greeting />)

    expect(getByText('Hello')).toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    expect(getByText('Hola')).toBeInTheDocument()
  })

  it('falls back to fallback language for missing keys', () => {
    const i18n = setupI18nTest('fr', 'errors')

    const result = i18n.t('required')
    expect(result).toBe('This field is required')
  })

  it('handles interpolation after locale switch', async () => {
    const { getByText, i18n } = renderWithI18n(<WelcomeMessage name="Alice" />)

    expect(getByText('Welcome, Alice!')).toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('es')
    })

    expect(getByText('¡Bienvenido, Alice!')).toBeInTheDocument()
  })
})
```

## RTL Layout Testing

```typescript
describe('RTL Layout Support', () => {
  it.each(['ar', 'he', 'fa', 'ur'])('applies correct dir attribute for %s', (locale) => {
    const { container } = renderWithI18n(
      <Layout>
        <Content />
      </Layout>,
      { language: locale }
    )

    const html = container.ownerDocument.documentElement
    expect(html.getAttribute('dir')).toBe('rtl')
  })

  it('switches dir attribute when toggling between LTR and RTL', async () => {
    const { i18n, container } = renderWithI18n(
      <Layout>
        <Content />
      </Layout>,
      { language: 'en' }
    )

    const html = container.ownerDocument.documentElement
    expect(html.getAttribute('dir')).toBe('ltr')

    await act(async () => {
      await i18n.changeLanguage('ar')
    })

    expect(html.getAttribute('dir')).toBe('rtl')
  })
})
```

## Missing Key Detection Test

```typescript
describe('Missing Key Detection', () => {
  it('logs warning for missing keys in development', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    const i18n = setupI18nTest('en')

    const result = i18n.t('nonexistent.key')

    expect(result).toBe('nonexistent.key')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent.key')
    )
    consoleSpy.mockRestore()
  })

  it('uses key as fallback value when not found', () => {
    const i18n = setupI18nTest('en')
    expect(i18n.t('unknown.key')).toBe('unknown.key')
  })
})
```

## Date and Number Formatting Tests

```typescript
describe('Locale-aware Formatting', () => {
  it.each([
    ['en', '1,000.50'],
    ['de', '1.000,50'],
    ['fr', '1 000,50'],
  ])('formats numbers correctly for %s', (locale, expected) => {
    const formatter = new Intl.NumberFormat(locale)
    expect(formatter.format(1000.5)).toBe(expected)
  })

  it.each([
    ['en', 'Monday, January 1, 2024'],
    ['es', 'lunes, 1 de enero de 2024'],
    ['de', 'Montag, 1. Januar 2024'],
  ])('formats dates correctly for %s', (locale, expected) => {
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const date = new Date(2024, 0, 1)
    expect(formatter.format(date)).toBe(expected)
  })
})
```

## Integration Test Example

```typescript
describe('Internationalized Form', () => {
  it('displays validation errors in selected language', async () => {
    const user = userEvent.setup()
    const { getByLabelText, getByText, findByText, i18n } = renderWithI18n(
      <ContactForm />,
      { language: 'es' }
    )

    await user.click(getByText('Enviar'))

    expect(await findByText('Este campo es obligatorio')).toBeInTheDocument()
  })

  it('submits translated form data correctly', async () => {
    const onSubmit = jest.fn()
    const user = userEvent.setup()
    const { getByLabelText, getByText, i18n } = renderWithI18n(
      <ContactForm onSubmit={onSubmit} />,
      { language: 'es' }
    )

    await user.type(getByLabelText('Nombre'), 'Alice')
    await user.type(getByLabelText('Correo'), 'alice@test.com')
    await user.click(getByText('Enviar'))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@test.com',
    })
  })
})
```

## Key Points

- Create dedicated test i18n instances with partial resources for each test
- Verify all translation keys exist across every supported locale
- Check that interpolation variables are consistent across languages
- Test pluralization rules for all locale-specific forms
- Validate locale switching updates the UI correctly
- Confirm RTL direction attribute switching on locale change
- Test missing key fallback behavior with warnings
- Ensure number and date formatting follows locale conventions
- Write integration tests for translated form validation messages
- Use snapshot tests for locale-specific formatted output
- Automate missing key detection in CI/CD pipeline
