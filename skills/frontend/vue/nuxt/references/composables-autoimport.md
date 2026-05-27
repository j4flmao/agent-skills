# Nuxt Composables and Auto-imports

## Overview
Nuxt 3 provides auto-imports for composables, components, and utility functions. Composables are reusable stateful functions following the Vue 3 composition API. This reference covers creating composables, auto-import configuration, built-in composables, and best practices.

## Built-in Composables

### useState
```typescript
// pages/counter.vue
<script setup lang="ts">
const count = useState('counter', () => 0);

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
  </div>
</template>
```

### useFetch and useAsyncData
```typescript
// pages/posts.vue
<script setup lang="ts">
const { data: posts, pending, error, refresh } = await useFetch('/api/posts', {
  params: { page: 1, limit: 10 },
  transform: (response) => response.posts,
  pick: ['id', 'title', 'createdAt'],
});

// With lazy loading
const { data: user } = useLazyFetch('/api/user', {
  server: false, // Client-side only
});

// With async data and custom fetcher
const { data: analytics } = useAsyncData('analytics', async () => {
  const [views, users, revenue] = await Promise.all([
    $fetch('/api/analytics/views'),
    $fetch('/api/analytics/users'),
    $fetch('/api/analytics/revenue'),
  ]);
  return { views, users, revenue };
});
</script>

<template>
  <div>
    <div v-if="pending">Loading...</div>
    <div v-else-if="error">{{ error.message }}</div>
    <div v-else>
      <PostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>
  </div>
</template>
```

### useCookie
```typescript
// composables/usePreferences.ts
export function usePreferences() {
  const theme = useCookie('theme', {
    default: () => 'light',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  const locale = useCookie('locale', {
    default: () => 'en',
    maxAge: 60 * 60 * 24 * 365,
  });

  return {
    theme: readonly(theme),
    locale: readonly(locale),
    setTheme: (t: 'light' | 'dark') => theme.value = t,
    setLocale: (l: string) => locale.value = l,
  };
}
```

### useHead and useSeoMeta
```typescript
// pages/about.vue
<script setup lang="ts">
useHead({
  title: 'About Us',
  meta: [
    { name: 'description', content: 'Learn more about our company' },
  ],
  bodyAttrs: {
    class: 'about-page',
  },
  script: [
    { src: 'https://example.com/script.js', defer: true },
  ],
});

useSeoMeta({
  title: 'About Us - MyApp',
  ogTitle: 'About Us - MyApp',
  description: 'Learn more about our company and mission',
  ogDescription: 'Learn more about our company and mission',
  ogImage: '/images/about-og.png',
  twitterCard: 'summary_large_image',
});
</script>
```

## Custom Composables

### Data Fetching Composable
```typescript
// composables/usePosts.ts
import type { Post, Pagination } from '~/types';

export function usePosts() {
  const posts = ref<Post[]>([]);
  const pagination = ref<Pagination | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPosts(page: number = 1) {
    loading.value = true;
    error.value = null;

    try {
      const { data, pagination: pageInfo } = await $fetch('/api/posts', {
        params: { page, limit: 10 },
      });
      posts.value = data;
      pagination.value = pageInfo;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch posts';
    } finally {
      loading.value = false;
    }
  }

  return {
    posts: readonly(posts),
    pagination: readonly(pagination),
    loading: readonly(loading),
    error: readonly(error),
    fetchPosts,
  };
}
```

### Authentication Composable
```typescript
// composables/useAuth.ts
export function useAuth() {
  const user = useState<User | null>('auth:user', () => null);
  const router = useRouter();
  const toast = useToast();

  async function login(email: string, password: string) {
    try {
      const data = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      user.value = data.user;
      toast.success('Logged in successfully');
      await router.push('/dashboard');
    } catch (e: any) {
      toast.error(e.data?.message || 'Login failed');
      throw e;
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    user.value = null;
    await router.push('/login');
  }

  async function fetchUser() {
    try {
      const data = await $fetch('/api/auth/me');
      user.value = data;
    } catch {
      user.value = null;
    }
  }

  return {
    user: readonly(user),
    isAuthenticated: computed(() => user.value !== null),
    login,
    logout,
    fetchUser,
  };
}
```

### Form Handling Composable
```typescript
// composables/useForm.ts
import type { ZodSchema } from 'zod';

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  submitting: boolean;
  dirty: boolean;
}

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  schema?: ZodSchema<T>
) {
  const state = reactive<FormState<T>>({
    values: { ...initialValues },
    errors: {},
    touched: {},
    submitting: false,
    dirty: false,
  });

  function setFieldValue<K extends keyof T>(field: K, value: T[K]) {
    state.values[field] = value;
    state.dirty = true;
    state.touched[field] = true;

    if (schema) {
      const result = schema.safeParse(state.values);
      if (!result.success) {
        const fieldError = result.error.errors.find(
          (e) => e.path[0] === field
        );
        state.errors[field] = fieldError?.message;
      } else {
        delete state.errors[field];
      }
    }
  }

  async function submit(handler: (values: T) => Promise<void>) {
    state.submitting = true;
    try {
      if (schema) {
        const result = schema.safeParse(state.values);
        if (!result.success) {
          result.error.errors.forEach((e) => {
            state.errors[e.path[0] as keyof T] = e.message;
          });
          return;
        }
      }
      await handler(state.values);
      state.dirty = false;
    } finally {
      state.submitting = false;
    }
  }

  function reset() {
    state.values = { ...initialValues };
    state.errors = {};
    state.touched = {};
    state.submitting = false;
    state.dirty = false;
  }

  return {
    ...toRefs(state),
    setFieldValue,
    submit,
    reset,
    isValid: computed(() => Object.keys(state.errors).length === 0),
  };
}
```

## Auto-import Configuration

### nuxt.config.ts
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    autoImport: true,

    // Add custom directories for auto-imports
    dirs: [
      'composables',
      'stores',
      'utils/validation',
    ],

    // Transform specific imports
    transform: {
      exclude: [/node_modules/],
    },
  },

  // Component auto-import
  components: {
    dirs: [
      '~/components',
      '~/components/ui',
      '~/components/layout',
    ],
    global: true,
    pathPrefix: false,
  },
});
```

## Key Points
- Composables are auto-imported from the composables/ directory
- useState creates shared reactive state across components
- useFetch and useAsyncData handle server-side data fetching
- useCookie manages client-side cookies with reactivity
- useHead and useSeoMeta manage document head and SEO
- Custom composables encapsulate reusable business logic
- readonly() prevents external mutation of composable state
- computed() provides derived values from refs
- Auto-import configuration in nuxt.config.ts controls scan directories
- Component auto-import eliminates manual imports
- Global components are available everywhere without import
- TypeScript support for composables improves developer experience
- Composables can use other composables for composition
- Lazy variants (useLazyFetch) don't block navigation
- useRefreshable provides refresh capability for data
- watch() triggers side effects on state changes
- Composables clean up with onUnmounted or scope API
- Keys in useState must be unique across the application
- Pick and transform options filter fetched data
