# i18n Performance

## Overview
Optimize internationalization performance: translation file loading, caching strategies, ICU message parsing, runtime formatting performance, and memory management.

## Translation Loading Strategy

```typescript
class TranslationLoader {
  private cache: Map<string, Record<string, string>> = new Map();
  private loading: Map<string, Promise<Record<string, string>>> = new Map();

  // Lazy load with deduplication
  async loadLocale(locale: string, namespace = 'common'): Promise<Record<string, string>> {
    const key = `${locale}:${namespace}`;

    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.loading.has(key)) return this.loading.get(key)!;

    const promise = this.fetchAndCache(locale, namespace);
    this.loading.set(key, promise);
    return promise;
  }

  private async fetchAndCache(locale: string, namespace: string): Promise<Record<string, string>> {
    const response = await fetch(`/locales/${locale}/${namespace}.json`);
    const data = await response.json();
    this.cache.set(`${locale}:${namespace}`, data);
    this.loading.delete(`${locale}:${namespace}`);
    return data;
  }

  // Preload critical namespaces
  async preloadCriticalLocales(locales: string[]): Promise<void> {
    const criticalNamespaces = ['common', 'error'];
    await Promise.all(
      locales.flatMap(locale =>
        criticalNamespaces.map(ns => this.loadLocale(locale, ns))
      )
    );
  }
}
```

## ICU Message Parsing Optimization

```typescript
class OptimizedMessageFormatter {
  private readonly compiledMessages = new Map<string, IntlMessageFormat>();
  private readonly MAX_CACHE_SIZE = 1000;

  format(key: string, locale: string, values: Record<string, unknown>): string {
    const cacheKey = `${locale}:${key}`;
    let formatter = this.compiledMessages.get(cacheKey);

    if (!formatter) {
      if (this.compiledMessages.size >= this.MAX_CACHE_SIZE) {
        // Evict oldest entry
        const firstKey = this.compiledMessages.keys().next().value!;
        this.compiledMessages.delete(firstKey);
      }

      const message = this.getMessage(key, locale);
      if (!message) return key; // Fallback to key

      formatter = new IntlMessageFormat(message, locale);
      this.compiledMessages.set(cacheKey, formatter);
    }

    return formatter.format(values) as string;
  }

  // Batch format multiple messages at once
  batchFormat(
    keys: string[],
    locale: string,
    valuesArray: Record<string, unknown>[]
  ): string[] {
    return keys.map((key, i) => this.format(key, locale, valuesArray[i]));
  }
}
```

## Server-Side Caching

```typescript
class ServerTranslationCache {
  private cache: Map<string, CachedTranslation> = new Map();
  private readonly TTL_MS = 3600000; // 1 hour
  private readonly MAX_ENTRIES = 500;

  constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 600000); // Every 10 minutes
  }

  getMessage(key: string, locale: string): string | null {
    const entry = this.cache.get(`${locale}:${key}`);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(`${locale}:${key}`);
      return null;
    }
    return entry.message;
  }

  setMessage(key: string, locale: string, message: string): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      // Remove 20% oldest entries
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.expiresAt - b.expiresAt);
      const toRemove = Math.floor(this.MAX_ENTRIES * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(`${locale}:${key}`, {
      message,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }
}
```

## Memory Management

```typescript
class TranslationMemoryManager {
  private readonly MAX_LOCALES_IN_MEMORY = 5;
  private readonly localeAccessOrder: string[] = [];

  async getTranslations(locale: string): Promise<Record<string, string>> {
    // Move to front (most recently used)
    this.updateAccessOrder(locale);
    return this.loader.loadLocale(locale);
  }

  private updateAccessOrder(locale: string): void {
    const index = this.localeAccessOrder.indexOf(locale);
    if (index > -1) this.localeAccessOrder.splice(index, 1);
    this.localeAccessOrder.unshift(locale);

    // Evict least recently used locale
    if (this.localeAccessOrder.length > this.MAX_LOCALES_IN_MEMORY) {
      const evicted = this.localeAccessOrder.pop()!;
      this.loader.evictLocale(evicted);
    }
  }

  async preloadUserLocales(userLocales: string[]): Promise<void> {
    // Sort by frequency, preload top N
    const localeFrequency = this.countBy(userLocales);
    const mostCommon = Object.entries(localeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.MAX_LOCALES_IN_MEMORY)
      .map(([locale]) => locale);

    await Promise.all(mostCommon.map(l => this.loader.loadLocale(l)));
  }
}
```

## Formatting Benchmarks

```typescript
describe('i18n Performance Benchmarks', () => {
  it('formats 10000 messages in under 100ms (cached)', () => {
    const formatter = new OptimizedMessageFormatter();
    formatter.preload('en-US', 'common');

    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      formatter.format('checkout.item_count', 'en-US', { count: i });
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('loads locale file in under 50ms (cached)', async () => {
    const loader = new TranslationLoader();

    // First load (uncached)
    const start1 = Date.now();
    await loader.loadLocale('en-US', 'common');
    const firstLoad = Date.now() - start1;

    // Second load (cached)
    const start2 = Date.now();
    await loader.loadLocale('en-US', 'common');
    const cachedLoad = Date.now() - start2;

    expect(cachedLoad).toBeLessThan(firstLoad / 10);
    expect(cachedLoad).toBeLessThan(5);
  });
});
```

## Key Points
- Lazy-load translation files with deduplication (prevent duplicate fetches)
- Compile ICU messages once and cache the compiled formatter
- Use LRU cache for translations with TTL (1 hour)
- Keep max 5 locales in memory, evict least recently used
- Preload critical namespaces (common, error) for most common locales
- Batch format messages when rendering lists of translated content
- Profile formatting performance: target 10000 messages under 100ms cached
- Use server-side cache with periodic cleanup of expired entries
