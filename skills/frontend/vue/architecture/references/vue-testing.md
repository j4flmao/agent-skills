# Vue Testing

## Component Test Setup

```typescript
import { mount, shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

function createTestOptions() {
  const pinia = createPinia()
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/about', component: { template: '<div>About</div>' } },
    ],
  })

  return {
    global: {
      plugins: [pinia, router],
      stubs: {
        'font-awesome-icon': true,
        'router-link': true,
        'transition': false,
      },
    },
  }
}

function mountWithSetup(component, options = {}) {
  const defaults = createTestOptions()
  return mount(component, {
    ...defaults,
    ...options,
    global: {
      ...defaults.global,
      ...options.global,
    },
  })
}
```

## Component Rendering Tests

```typescript
describe('UserCard', () => {
  it('renders user name and email', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: {
          name: 'Alice',
          email: 'alice@example.com',
          avatar: '/avatar.jpg',
        },
      },
    })

    expect(wrapper.find('.user-name').text()).toBe('Alice')
    expect(wrapper.find('.user-email').text()).toBe('alice@example.com')
    expect(wrapper.find('img').attributes('src')).toBe('/avatar.jpg')
  })

  it('emits click event', async () => {
    const wrapper = mount(UserCard, {
      props: {
        user: { name: 'Bob', email: 'bob@test.com' },
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual([{ id: 1 }])
  })

  it('shows loading state', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: null,
        loading: true,
      },
    })

    expect(wrapper.find('.skeleton').exists()).toBe(true)
    expect(wrapper.find('.user-name').exists()).toBe(false)
  })
})
```

## Composition API Tests

```typescript
import { ref, computed } from 'vue'
import { useCounter } from './useCounter'

describe('useCounter composable', () => {
  it('initializes with default value', () => {
    const { count, increment, decrement } = useCounter()

    expect(count.value).toBe(0)
  })

  it('initializes with custom value', () => {
    const { count } = useCounter(10)
    expect(count.value).toBe(10)
  })

  it('increments the count', () => {
    const { count, increment } = useCounter()

    increment()
    expect(count.value).toBe(1)

    increment()
    expect(count.value).toBe(2)
  })

  it('decrements the count', () => {
    const { count, decrement } = useCounter(5)

    decrement()
    expect(count.value).toBe(4)
  })

  it('does not go below zero by default', () => {
    const { count, decrement } = useCounter(0)

    decrement()
    expect(count.value).toBe(0)
  })
})
```

## Pinia Store Tests

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './userStore'

describe('UserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetches users', async () => {
    const mockUsers = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUsers),
    })

    const store = useUserStore()
    await store.fetchUsers()

    expect(store.users).toEqual(mockUsers)
    expect(store.loading).toBe(false)
  })

  it('adds user to store', () => {
    const store = useUserStore()
    store.addUser({ id: 3, name: 'Charlie' })

    expect(store.users).toHaveLength(1)
    expect(store.users[0].name).toBe('Charlie')
  })

  it('removes user by id', () => {
    const store = useUserStore()
    store.users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]

    store.removeUser(1)
    expect(store.users).toHaveLength(1)
    expect(store.users[0].id).toBe(2)
  })

  it('computed active user count', () => {
    const store = useUserStore()
    store.users = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false },
    ]

    expect(store.activeUserCount).toBe(1)
  })
})
```

## Router Navigation Tests

```typescript
describe('NavigationGuard', () => {
  it('redirects unauthenticated users to login', async () => {
    const wrapper = mountWithSetup(ProtectedPage)
    const router = wrapper.router

    await router.push('/protected')
    await router.isReady()

    expect(wrapper.router.currentRoute.value.path).toBe('/login')
  })

  it('allows authenticated users to access protected routes', async () => {
    const authStore = useAuthStore()
    authStore.user = { id: 1, name: 'Alice' }

    const wrapper = mountWithSetup(ProtectedPage)

    await wrapper.router.push('/protected')
    await wrapper.router.isReady()

    expect(wrapper.router.currentRoute.value.path).toBe('/protected')
  })
})
```

## Event and Slot Tests

```typescript
describe('DataTable', () => {
  it('renders slot content for each row', () => {
    const wrapper = mount(DataTable, {
      props: {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      },
      slots: {
        default: `
          <template #item="{ item }">
            <div class="custom-row">{{ item.name }}</div>
          </template>
        `,
      },
    })

    expect(wrapper.findAll('.custom-row')).toHaveLength(2)
    expect(wrapper.find('.custom-row').text()).toBe('Item 1')
  })

  it('shows empty slot when no items', () => {
    const wrapper = mount(DataTable, {
      props: { items: [] },
      slots: {
        empty: '<div class="empty-state">No items found</div>',
      },
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })
})
```

## Async Component Tests

```typescript
describe('AsyncDataComponent', () => {
  it('shows loading state while fetching', () => {
    const wrapper = mount(AsyncDataComponent, {
      props: { url: '/api/data' },
    })

    expect(wrapper.find('.loading').exists()).toBe(true)
    expect(wrapper.find('.error').exists()).toBe(false)
    expect(wrapper.find('.data').exists()).toBe(false)
  })

  it('renders data after successful fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'Test Data' }),
    })

    const wrapper = mount(AsyncDataComponent, {
      props: { url: '/api/data' },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.data').text()).toContain('Test Data')
    expect(wrapper.find('.loading').exists()).toBe(false)
  })

  it('shows error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const wrapper = mount(AsyncDataComponent, {
      props: { url: '/api/data' },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error').exists()).toBe(true)
    expect(wrapper.find('.error').text()).toContain('Network error')
  })
})
```

## Key Points

- Use mountWithSetup pattern for consistent test configuration
- Test component rendering with various prop combinations
- Test emitted events and their payloads
- Verify loading, empty, and error states
- Test Pinia stores in isolation with setActivePinia
- Mock API calls to test async behavior
- Test router guards and navigation behavior
- Verify slot rendering with different slot templates
- Use vitest for fast component testing
- Test composable functions independently of components
- Clean up mocks and stubs between tests
- Keep tests focused on behavior, not implementation details
