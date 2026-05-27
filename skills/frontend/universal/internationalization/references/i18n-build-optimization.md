# i18n Build Optimization

## Code Splitting by Locale

```typescript
// webpack.config.js
module.exports = {
  plugins: [
    new webpack.ContextReplacementPlugin(
      /i18next[/\\]locales/,
      /en|es|fr|de|ja/
    ),
  ],
}

// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'i18n-en': ['./src/locales/en.json'],
          'i18n-es': ['./src/locales/es.json'],
          'i18n-fr': ['./src/locales/fr.json'],
        },
      },
    },
  },
})
```

## Lazy Loading Locale Files

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const LOCALE_CACHE = new Map<string, Record<string, unknown>>()

async function loadLocale(locale: string, namespace = 'translation'): Promise<void> {
  const cacheKey = `${locale}:${namespace}`

  if (LOCALE_CACHE.has(cacheKey)) {
    i18n.addResourceBundle(locale, namespace, LOCALE_CACHE.get(cacheKey)!, true, true)
    return
  }

  try {
    const resources = await import(`./locales/${locale}/${namespace}.json`)
    LOCALE_CACHE.set(cacheKey, resources)
    i18n.addResourceBundle(locale, namespace, resources, true, true)
  } catch (error) {
    console.warn(`Failed to load locale ${locale}/${namespace}:`, error)
  }
}

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translation'],
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  partialBundledLanguages: true,
  resources: {
    en: {
      translation: require('./locales/en/translation.json'),
    },
  },
})
```

## Preloading Strategy

```typescript
const LOCALE_PRIORITIES: Record<string, { preload: string[]; prefetch: string[] }> = {
  en: {
    preload: ['common', 'errors'],
    prefetch: ['settings', 'help', 'dashboard'],
  },
  es: {
    preload: ['common', 'errors'],
    prefetch: ['settings', 'help'],
  },
}

async function preloadEssentialNamespaces(locale: string): Promise<void> {
  const priority = LOCALE_PRIORITIES[locale]
  if (!priority) return

  const preloadPromises = priority.preload.map(ns =>
    loadLocale(locale, ns)
  )
  await Promise.all(preloadPromises)
}

function prefetchSecondaryNamespaces(locale: string): void {
  const priority = LOCALE_PRIORITIES[locale]
  if (!priority) return

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      priority.prefetch.forEach(ns => loadLocale(locale, ns))
    })
  } else {
    setTimeout(() => {
      priority.prefetch.forEach(ns => loadLocale(locale, ns))
    }, 2000)
  }
}
```

## Locale Detection and Asset Loading

```typescript
interface LocaleAssetConfig {
  primary: string[]
  fallback: string[]
  onLocaleDetected?: (locale: string) => void
}

async function detectAndLoadOptimalLocale(config: LocaleAssetConfig): Promise<string> {
  const detected = detectUserLocale(config.primary)
  const locale = config.primary.includes(detected) ? detected : config.fallback[0]

  config.onLocaleDetected?.(locale)

  await preloadEssentialNamespaces(locale)
  prefetchSecondaryNamespaces(locale)

  return locale
}

function detectUserLocale(supported: string[]): string {
  const browserLocales = navigator.languages.map(l => l.split('-')[0])
  for (const bl of browserLocales) {
    if (supported.includes(bl)) return bl
  }
  return supported[0]
}
```

## Webpack i18n Optimizations

```typescript
// webpack.config.js - i18n optimization
const I18NPlugin = {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('I18NPlugin', (compilation, callback) => {
      const locales = ['en', 'es', 'fr', 'de', 'ja']
      const namespaces = ['common', 'errors', 'nav', 'settings']

      for (const locale of locales) {
        for (const ns of namespaces) {
          const assetName = `locales/${locale}/${ns}.json`
          if (!compilation.assets[assetName]) {
            compilation.emitAsset(
              assetName,
              new compiler.webpack.sources.RawSource('{}')
            )
          }
        }
      }
      callback()
    })
  },
}

// Dynamic import with webpack magic comments
function loadLazyLocale(locale: string, ns: string) {
  return import(
    /* webpackChunkName: "locale-[request]" */
    /* webpackMode: "lazy" */
    /* webpackPrefetch: true */
    `./locales/${locale}/${ns}.json`
  )
}
```

## Tree Shaking Unused Locales

```typescript
// vite.config.ts for tree-shaking
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    {
      name: 'locale-tree-shake',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('i18next') && id.endsWith('.js')) {
          return code.replace(
            /require\(['"]\.\/locales\/(?!en\/)[^'"]+['"]\)/g,
            '{}'
          )
        }
        return code
      },
    },
  ],
})
```

## Caching Strategy

```typescript
interface LocaleCacheConfig {
  version: string
  storageKey?: string
  maxAge?: number
}

class LocaleCache {
  private version: string
  private storageKey: string
  private maxAge: number
  private cache: Map<string, { data: Record<string, unknown>; timestamp: number }>

  constructor(config: LocaleCacheConfig) {
    this.version = config.version
    this.storageKey = config.storageKey ?? 'locale_cache'
    this.maxAge = config.maxAge ?? 24 * 60 * 60 * 1000
    this.cache = new Map()
    this.loadFromStorage()
  }

  get(locale: string, namespace: string): Record<string, unknown> | null {
    const key = `${locale}:${namespace}:${this.version}`
    const entry = this.cache.get(key)

    if (entry && Date.now() - entry.timestamp < this.maxAge) {
      return entry.data
    }

    return null
  }

  set(locale: string, namespace: string, data: Record<string, unknown>): void {
    const key = `${locale}:${namespace}:${this.version}`
    this.cache.set(key, { data, timestamp: Date.now() })
    this.saveToStorage()
  }

  invalidate(locale?: string): void {
    if (locale) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(locale)) this.cache.delete(key)
      }
    } else {
      this.cache.clear()
    }
    this.saveToStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.version === this.version) {
          this.cache = new Map(Object.entries(parsed.entries))
        }
      }
    } catch {
      this.cache = new Map()
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        version: this.version,
        entries: Object.fromEntries(this.cache.entries()),
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch {
      /* quota exceeded - ignore */
    }
  }
}
```

## Bundle Size Analysis

```typescript
interface LocaleBundleStats {
  locale: string
  namespace: string
  size: number
  compressedSize: number
  keys: number
}

async function analyzeLocaleBundles(): Promise<LocaleBundleStats[]> {
  const stats: LocaleBundleStats[] = []
  const locales = ['en', 'es', 'fr', 'de', 'ja']
  const namespaces = ['common', 'errors', 'nav', 'settings']

  for (const locale of locales) {
    for (const ns of namespaces) {
      try {
        const module = await import(`./locales/${locale}/${ns}.json`)
        const json = JSON.stringify(module)
        const blob = new Blob([json])
        const compressed = new Blob([json])

        stats.push({
          locale,
          namespace: ns,
          size: blob.size,
          compressedSize: compressed.size,
          keys: Object.keys(module).length,
        })
      } catch {
        stats.push({
          locale,
          namespace: ns,
          size: 0,
          compressedSize: 0,
          keys: 0,
        })
      }
    }
  }

  return stats
}
```

## Key Points

- Split locale files into separate chunks to avoid bundling all languages
- Lazy-load locale files on demand based on user language
- Preload critical namespaces and prefetch secondary ones using idle callbacks
- Cache loaded locale resources in memory and localStorage
- Use webpack context replacement to exclude unused locales
- Tree-shake unused locale files in production builds
- Version locale caches to invalidate stale translations
- Analyze bundle size per locale and namespace
- Load only the detected user locale on initial page load
- Use dynamic imports with prefetch hints for secondary locales
- Implement fallback chain to handle missing locale resources
