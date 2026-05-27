# Vue Testing with Vitest

## Overview
Vitest is a blazing-fast unit test framework powered by Vite. It provides Jest-compatible API with native ESM support, HMR, and TypeScript integration. This reference covers component testing, composable testing, mocking, and code coverage.

## Test Setup

### Basic Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/main.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

### Setup File
```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/vue';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

## Component Testing

### Mounting Components
```typescript
// src/components/__tests__/Counter.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Counter from '../Counter.vue';

describe('Counter', () => {
  it('renders initial count', () => {
    const wrapper = mount(Counter);
    expect(wrapper.text()).toContain('Count: 0');
  });

  it('increments count on button click', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toContain('Count: 1');
  });

  it('emits event when count changes', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:count')).toBeTruthy();
    expect(wrapper.emitted('update:count')![0]).toEqual([1]);
  });
});
```

### Props and Slots
```typescript
// src/components/__tests__/Card.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Card from '../Card.vue';

describe('Card', () => {
  it('renders with props', () => {
    const wrapper = mount(Card, {
      props: {
        title: 'Test Card',
        description: 'A test card component',
        variant: 'primary',
      },
    });

    expect(wrapper.find('[data-testid="card-title"]').text()).toBe('Test Card');
    expect(wrapper.find('[data-testid="card-desc"]').text()).toBe('A test card component');
    expect(wrapper.classes()).toContain('card--primary');
  });

  it('renders default slot content', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Slot content</p>',
        footer: '<button>Action</button>',
      },
    });

    expect(wrapper.find('p').text()).toBe('Slot content');
    expect(wrapper.find('button').text()).toBe('Action');
  });

  it('shows loading state', () => {
    const wrapper = mount(Card, {
      props: {
        loading: true,
        title: 'Test',
      },
    });

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="card-title"]').exists()).toBe(false);
  });
});
```

## Composable Testing

### Testing Composables
```typescript
// src/composables/__tests__/useCounter.test.ts
import { describe, it, expect } from 'vitest';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { count } = useCounter();
    expect(count.value).toBe(0);
  });

  it('initializes with custom value', () => {
    const { count } = useCounter(10);
    expect(count.value).toBe(10);
  });

  it('increments count', () => {
    const { count, increment } = useCounter();
    increment();
    expect(count.value).toBe(1);
  });

  it('decrements count', () => {
    const { count, decrement } = useCounter();
    decrement();
    expect(count.value).toBe(-1);
  });

  it('resets count', () => {
    const { count, increment, reset } = useCounter();
    increment();
    increment();
    reset();
    expect(count.value).toBe(0);
  });

  it('computes doubled value', () => {
    const { count, increment, doubled } = useCounter();
    increment();
    increment();
    expect(doubled.value).toBe(4);
  });
});
```

## Mocking

### Mocking Modules
```typescript
// src/services/__tests__/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchUsers } from '../api';

vi.mock('../http-client', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { httpClient } from '../http-client';

describe('fetchUsers', () => {
  it('returns users on success', async () => {
    const mockUsers = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];

    vi.mocked(httpClient.get).mockResolvedValue({ data: mockUsers });

    const users = await fetchUsers();
    expect(users).toEqual(mockUsers);
    expect(httpClient.get).toHaveBeenCalledWith('/users');
  });

  it('throws on error', async () => {
    vi.mocked(httpClient.get).mockRejectedValue(new Error('Network error'));

    await expect(fetchUsers()).rejects.toThrow('Network error');
  });
});
```

### Mocking Components
```typescript
// src/components/__tests__/UserProfile.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserProfile from '../UserProfile.vue';

vi.mock('../AvatarImage.vue', () => ({
  default: {
    props: ['src', 'alt'],
    template: '<img :src="src" :alt="alt" data-testid="mocked-avatar" />',
  },
}));

describe('UserProfile', () => {
  it('renders with mocked avatar', () => {
    const wrapper = mount(UserProfile, {
      props: {
        user: {
          name: 'Alice',
          avatar: '/avatars/alice.jpg',
        },
      },
    });

    expect(wrapper.find('[data-testid="mocked-avatar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mocked-avatar"]').attributes('src'))
      .toBe('/avatars/alice.jpg');
  });
});
```

## Pinia Store Testing

### Testing Stores
```typescript
// src/stores/__tests__/counter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCounterStore } from '../counter';

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with zero', () => {
    const store = useCounterStore();
    expect(store.count).toBe(0);
  });

  it('increments count', () => {
    const store = useCounterStore();
    store.increment();
    expect(store.count).toBe(1);
  });

  it('computes doubleCount', () => {
    const store = useCounterStore();
    store.count = 5;
    expect(store.doubleCount).toBe(10);
  });
});
```

## Async Testing

### Testing Async Components
```typescript
// src/components/__tests__/AsyncData.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AsyncData from '../AsyncData.vue';

async function createWrapper() {
  const wrapper = mount(AsyncData);
  await flushPromises();
  return wrapper;
}

describe('AsyncData', () => {
  it('shows loading state initially', () => {
    const wrapper = mount(AsyncData);
    expect(wrapper.text()).toContain('Loading...');
  });

  it('displays data after fetch', async () => {
    const wrapper = await createWrapper();
    expect(wrapper.find('[data-testid="data-content"]').exists()).toBe(true);
  });

  it('handles fetch error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = await createWrapper();
    // Simulate error scenario
  });
});
```

## Key Points
- Vitest provides Jest-compatible API with Vite-native performance
- mount() from @vue/test-utils renders Vue components for testing
- props, slots, and attrs configure component test rendering
- flushPromises() resolves pending async operations
- vi.mock() and vi.spyOn() handle module mocking
- Pinia stores tested with setActivePinia
- Composable tests don't need component mounting
- Coverage thresholds enforce code quality
- JSDOM provides browser-like DOM environment
- Testing library (@testing-library/vue) encourages accessible queries
- HMR support enables fast test feedback loops
- Inline snapshots track component output changes
- vi.useFakeTimers() controls time-dependent code
- Factory functions reduce test setup boilerplate
- Mock service worker (MSW) for API mocking
- Component stubs simplify testing of complex component hierarchies
- Transition and KeepAlive stubs prevent rendering issues
- v-model testing uses setValue() and emitted()
