# Nuxt Testing

## Setup and Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/test-utils/module'],
})

// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

## Page Component Testing

```typescript
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

describe('Index Page', () => {
  it('renders the title', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.find('h1').text()).toBe('Welcome')
  })

  it('renders with NuxtLink', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.find('a').attributes('href')).toBe('/about')
  })

  it('uses page meta', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const route = useRoute()

    expect(route.path).toBe('/')
  })
})
```

## Composable Testing

```typescript
import { describe, it, expect } from 'vitest'
import { useCounter } from './composables/useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { count } = useCounter()
    expect(count.value).toBe(0)
  })

  it('increments the count', () => {
    const { count, increment } = useCounter(10)
    increment()
    expect(count.value).toBe(11)
  })
})
```

## Auto-import Testing

```typescript
describe('Auto-imported utilities', () => {
  it('ref is auto-imported', () => {
    const count = ref(0)
    expect(count.value).toBe(0)
  })

  it('computed is auto-imported', () => {
    const count = ref(5)
    const doubled = computed(() => count.value * 2)
    expect(doubled.value).toBe(10)
  })

  it('useFetch works in test environment', async () => {
    const { data, error } = await useFetch('/api/test')
    expect(data.value).toBeDefined()
  })
})
```

## Server Route Testing

```typescript
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('API Routes', async () => {
  await setup({
    server: true,
  })

  it('GET /api/hello returns greeting', async () => {
    const response = await $fetch('/api/hello')
    expect(response).toEqual({ message: 'Hello World' })
  })

  it('POST /api/auth/login validates input', async () => {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: 'invalid', password: 'short' },
      ignoreResponseError: true,
    })

    expect(response.statusCode).toBe(400)
    expect(response.body).toHaveProperty('message')
  })

  it('requires authentication for protected routes', async () => {
    const response = await $fetch('/api/auth/me', {
      ignoreResponseError: true,
    })

    expect(response.statusCode).toBe(401)
  })
})
```

## Component with Async Data

```typescript
describe('Dashboard Component', () => {
  it('renders fetched data', async () => {
    global.$fetch = vi.fn().mockResolvedValue({
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    })

    const wrapper = await mountSuspended(Dashboard)

    expect(wrapper.find('.loading')).toBeTruthy()
    await nextTick()
    await nextTick()

    expect(wrapper.findAll('.user-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('Alice')
  })

  it('handles fetch error', async () => {
    global.$fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const wrapper = await mountSuspended(Dashboard)
    await nextTick()
    await nextTick()

    expect(wrapper.find('.error-message').text()).toContain('Network error')
    expect(wrapper.find('button').text()).toBe('Retry')
  })
})
```

## E2E Testing with Playwright

```typescript
import { describe, it, expect } from 'vitest'
import { setup, createPage, url } from '@nuxt/test-utils/e2e'

describe('Authentication Flow', async () => {
  await setup({
    browser: true,
    runner: 'playwright',
  })

  it('logs in successfully', async () => {
    const page = await createPage()

    await page.goto(url('/login'))
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL(url('/dashboard'))
    expect(await page.locator('h1').textContent()).toContain('Dashboard')
  })

  it('shows error on invalid credentials', async () => {
    const page = await createPage()

    await page.goto(url('/login'))
    await page.fill('[name="email"]', 'wrong@email.com')
    await page.fill('[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')

    expect(await page.locator('.error').textContent()).toContain('Invalid')
  })

  it('redirects unauthenticated user to login', async () => {
    const page = await createPage()
    await page.goto(url('/dashboard'))

    expect(page.url()).toContain('/login')
  })
})
```

## Module Testing

```typescript
describe('Custom Nuxt Module', () => {
  it('registers composable', async () => {
    const module = await loadModule('my-module')
    expect(module.options).toBeDefined()
  })

  it('adds Vite plugin', () => {
    const config = getNuxtConfig()
    const plugins = config.vite?.plugins ?? []
    expect(plugins.length).toBeGreaterThan(0)
  })
})
```

## Key Points

- Use @nuxt/test-utils for Nuxt-aware testing
- Use mountSuspended for mounting components with Nuxt context
- Test auto-imports (ref, computed, useFetch) without explicit imports
- Use setup with server: true for API route testing
- Write E2E tests with @nuxt/test-utils/e2e for browser testing
- Mock $fetch for testing async data components
- Test error states and loading states in components
- Verify page meta and middleware behavior
- Test composables in isolation with Nuxt runtime
- Use createPage for browser-based page interaction tests
- Test module registration and configuration
- Ensure redirects work correctly for protected routes
