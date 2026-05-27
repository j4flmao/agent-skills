# Vue Error Handling

## Global Error Handler

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'

const app = createApp(App)

app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error)
  console.log('Vue instance:', instance)
  console.log('Error info:', info)

  reportError(error, {
    component: instance?.type?.__name ?? 'Unknown',
    info,
    props: instance?.$props,
  })
}

app.config.warnHandler = (warning, instance, info) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Vue Warning]: ${warning}`, instance, info)
  }
}

app.mount('#app')
```

## Error Boundaries in Vue

```vue
<template>
  <div v-if="hasError" class="error-boundary">
    <h2>Something went wrong</h2>
    <p>{{ error?.message }}</p>
    <button @click="reset">Try Again</button>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured, provide } from 'vue'

const error = ref(null)
const hasError = ref(false)
const errorCount = ref(0)
const MAX_ERRORS = 3

onErrorCaptured((err, instance, info) => {
  error.value = err
  hasError.value = true
  errorCount.value++

  reportError(err, {
    component: instance?.type?.__name,
    info,
    errorCount: errorCount.value,
  })

  if (errorCount.value >= MAX_ERRORS) {
    console.error('Max error count reached, not retrying')
  }

  return false
})

function reset() {
  if (errorCount.value < MAX_ERRORS) {
    error.value = null
    hasError.value = false
  }
}

provide('errorBoundary', {
  hasError,
  reset,
})
</script>
```

## Async Error Handling

```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="retry">Retry</button>
    </div>
    <div v-else>
      <slot :data="data" />
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect, onUnmounted } from 'vue'

const props = defineProps({
  fetcher: {
    type: Function,
    required: true,
  },
  immediate: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['error', 'success'])

const data = ref(null)
const error = ref(null)
const loading = ref(false)

async function execute() {
  loading.value = true
  error.value = null

  try {
    data.value = await props.fetcher()
    emit('success', data.value)
  } catch (e) {
    error.value = e.message ?? 'An error occurred'
    emit('error', e)
  } finally {
    loading.value = false
  }
}

function retry() {
  execute()
}

if (props.immediate) {
  watchEffect(() => {
    execute()
  })
}

onUnmounted(() => {
  data.value = null
  error.value = null
})
</script>
```

## Composables for Error Handling

```typescript
import { ref, type Ref } from 'vue'

interface AsyncState<T> {
  data: Ref<T | null>
  error: Ref<string | null>
  loading: Ref<boolean>
  execute: () => Promise<void>
  reset: () => void
}

function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null

    try {
      data.value = await fn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    data.value = null
    error.value = null
    loading.value = false
  }

  return { data, error, loading, execute, reset }
}

function useRetry(fn: () => Promise<void>, maxRetries = 3) {
  const attempts = ref(0)

  async function execute() {
    while (attempts.value < maxRetries) {
      try {
        await fn()
        attempts.value = 0
        return
      } catch (error) {
        attempts.value++
        if (attempts.value >= maxRetries) {
          throw error
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts.value)))
      }
    }
  }

  return { execute, attempts }
}
```

## Router Error Handling

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/Home.vue'),
    },
    {
      path: '/dashboard',
      component: () => import('./views/Dashboard.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('./views/NotFound.vue'),
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const isAuthenticated = await checkAuth()
      if (!isAuthenticated) {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      next({ name: 'error', params: { error: 'auth-failed' } })
      return
    }
  }
  next()
})

router.onError((error) => {
  console.error('Router error:', error)
  reportError(error)
})

export default router
```

## Error Display Component

```vue
<template>
  <div class="error-display" :class="`error-display--${variant}`" role="alert">
    <div class="error-display__icon">
      <AlertTriangle v-if="variant === 'warning'" />
      <AlertCircle v-else />
    </div>
    <div class="error-display__content">
      <h3 v-if="title" class="error-display__title">{{ title }}</h3>
      <p class="error-display__message">{{ message }}</p>
      <slot name="actions">
        <button
          v-if="retryable"
          @click="$emit('retry')"
          class="error-display__retry"
        >
          Try Again
        </button>
      </slot>
    </div>
    <button
      v-if="dismissible"
      @click="$emit('dismiss')"
      class="error-display__close"
      aria-label="Dismiss"
    >
      &times;
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  message: { type: String, required: true },
  variant: {
    type: String,
    default: 'error',
    validator: (v) => ['error', 'warning', 'info'].includes(v),
  },
  retryable: { type: Boolean, default: false },
  dismissible: { type: Boolean, default: false },
})

defineEmits(['retry', 'dismiss'])
</script>
```

## Key Points

- Configure global app errorHandler to catch all Vue errors
- Use onErrorCaptured for component-level error boundaries
- Prevent error propagation with return false in onErrorCaptured
- Implement async error handling with loading/error/data states
- Limit retry attempts to prevent infinite error loops
- Route to error pages for navigation failures
- Catch async component loading errors with error components
- Provide user-friendly error messages with retry options
- Log errors with component context for debugging
- Use Suspense for async component error handling
- Dismissible error banners for non-critical warnings
- Fallback to error page when boundary errors cannot be recovered
