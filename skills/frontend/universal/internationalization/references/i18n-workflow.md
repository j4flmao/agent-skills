# i18n Workflow

## Translation Workflow

```
Source Code      Extract        Translation        Build
  (en)          (keys)           (all locales)    (bundles)
    │              │                  │               │
    ▼              ▼                  ▼               ▼
t('key') ───→ extraction ───→ .json files ────→ locale bundles
              (i18next-scanner)   translated         (lazy loaded)
```

## Key Extraction

```bash
# Extract keys from source code
npx i18next-scanner --config i18next-scanner.config.js

# i18next-scanner.config.js
module.exports = {
  input: ['src/**/*.{ts,tsx}', '!src/**/*.test.*'],
  options: {
    func: { list: ['t', 'i18n.t'] },
    lngs: ['en', 'fr', 'ar'],
    ns: ['common', 'auth', 'dashboard'],
    defaultNs: 'common',
    resource: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
      savePath: 'locales/{{lng}}/{{ns}}.json',
    },
  },
}
```

## Translation Management Platforms

| Platform | Free Tier | Collaboration | API | Git Sync |
|----------|-----------|---------------|-----|----------|
| Lokalise | 500 keys | Yes | Yes | Yes |
| Crowdin | Open source free | Yes | Yes | Yes |
| POEditor | 1000 keys | Yes | Yes | Yes |
| Transifex | 59 keys | Yes | Yes | Yes |
| SimpleLocalize | 500 keys | Yes | Yes | Yes |
| WebTranslateIt | 250 keys | Yes | Yes | Yes |

## CI/CD Integration

```yaml
# .github/workflows/i18n.yml
name: i18n Sync

on:
  push:
    branches: [main]
    paths: ['src/**/*.{ts,tsx}']

jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Extract translation keys
        run: npx i18next-scanner --config i18next-scanner.config.js

      - name: Push to translation platform
        run: npx @lokalise/cli push --token ${{ secrets.LOKALISE_TOKEN }}
        # Languages: en, fr, ar, ja, de, es

      - name: Pull translations
        run: npx @lokalise/cli pull --token ${{ secrets.LOKALISE_TOKEN }}

      - name: Validate translations (no missing keys)
        run: npx ts-node scripts/validate-translations.ts

      - name: Commit updated translations
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore(i18n): update translation files"
          file_pattern: "locales/**"
```

## Missing Key Detection

```typescript
// Development-only: log missing translations
import i18n from 'i18next'

const originalT = i18n.t
i18n.t = (key, ...args) => {
  const translation = originalT.call(i18n, key, ...args)
  if (translation === key) {
    console.warn(`[i18n] Missing translation key: "${key}" in locale "${i18n.language}"`)
  }
  return translation
}
```

## Translation Quality Checks

```typescript
// Validate all locales have same keys as English
import en from '../locales/en/common.json'
import fr from '../locales/fr/common.json'

function findMissingKeys(base: Record<string, unknown>, target: Record<string, unknown>, prefix = ''): string[] {
  const missing: string[] = []
  for (const key of Object.keys(base)) {
    const fullPath = prefix ? `${prefix}.${key}` : key
    if (typeof base[key] === 'object' && base[key] !== null) {
      missing.push(...findMissingKeys(base[key] as Record<string, unknown>, target[key] as Record<string, unknown> || {}, fullPath))
    } else if (!(key in target)) {
      missing.push(fullPath)
    }
  }
  return missing
}

const missingInFr = findMissingKeys(en, fr)
if (missingInFr.length > 0) {
  console.warn(`Missing French translations: ${missingInFr.join(', ')}`)
}
```

## Pseudolocalization

```typescript
// Generate pseudo-localized strings for testing
function pseudoLocalize(str: string): string {
  const map: Record<string, string> = {
    'a': 'α', 'b': 'β', 'c': 'ϲ', 'd': 'ԁ', 'e': 'е',
    'f': 'f', 'g': 'ɡ', 'h': 'һ', 'i': 'і', 'j': 'ϳ',
    'k': 'ĸ', 'l': 'ӏ', 'm': 'm', 'n': 'п', 'o': 'о',
    'p': 'р', 'q': 'ԛ', 'r': 'г', 's': 'ѕ', 't': 'т',
    'u': 'υ', 'v': 'ѵ', 'w': 'ԝ', 'x': 'х', 'y': 'у', 'z': 'z',
  }

  const pseudo = str.split('').map(c => map[c.toLowerCase()] || c).join('')
  return `[${pseudo}]`  // brackets help identify truncated strings
}
```

## RTL Testing

```typescript
// Force RTL in test environment
beforeEach(() => {
  document.documentElement.dir = 'rtl'
  document.documentElement.lang = 'ar'
})

afterEach(() => {
  document.documentElement.dir = 'ltr'
  document.documentElement.lang = 'en'
})

it('renders correctly in RTL', () => {
  const { container } = render(<Sidebar />)
  // Assert logical property usage
  expect(container.firstChild).toHaveStyle({ marginInlineStart: '16px' })
})
```

## Locale Maintenance Checklist

- [ ] New feature includes extraction-ready translation keys
- [ ] All user-facing strings use `t()` — no hardcoded text
- [ ] Translation keys extracted before PR merge
- [ ] Translations pulled from platform during CI
- [ ] Missing key warnings enabled in dev mode
- [ ] ICU plural rules correct for all locales
- [ ] RTL layout verified for Arabic/Hebrew locales
- [ ] Date/number formatting uses Intl API
- [ ] Translation files under version control
- [ ] Lazy loading configured to avoid bundle bloat
