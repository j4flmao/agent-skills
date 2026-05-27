# Nuxt Auth

## Middleware Setup

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { user, authenticated } = useAuth()

  if (!authenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  if (to.meta.roles && !to.meta.roles.includes(user.value?.role)) {
    return abortNavigation({
      statusCode: 403,
      message: 'Insufficient permissions',
    })
  }
})

// middleware/guest.ts
export default defineNuxtRouteMiddleware(() => {
  const { authenticated } = useAuth()

  if (authenticated.value) {
    return navigateTo('/dashboard')
  }
})
```

## Auth Composable

```typescript
// composables/useAuth.ts
interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
}

export const useAuth = () => {
  const state = useState<AuthState>('auth', () => ({
    user: null,
    token: null,
    loading: false,
  }))

  const authenticated = computed(() => !!state.value.token)
  const user = computed(() => state.value.user)

  async function login(credentials: LoginCredentials) {
    state.value.loading = true
    try {
      const { data, error } = await useFetch('/api/auth/login', {
        method: 'POST',
        body: credentials,
      })

      if (error.value) throw new Error(error.value.message)

      const { token, user: userData } = data.value as any
      state.value.token = token
      state.value.user = userData

      const cookieToken = useCookie('auth_token', {
        maxAge: 60 * 60 * 24 * 7,
        secure: true,
        sameSite: 'strict',
      })
      cookieToken.value = token

      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    } finally {
      state.value.loading = false
    }
  }

  async function register(data: RegisterData) {
    state.value.loading = true
    try {
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: data,
      })
      return { success: true, data: response }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Registration failed' }
    } finally {
      state.value.loading = false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Logout even if server request fails
    } finally {
      state.value.token = null
      state.value.user = null
      const cookieToken = useCookie('auth_token')
      cookieToken.value = null
      navigateTo('/login')
    }
  }

  async function fetchUser() {
    try {
      const userData = await $fetch('/api/auth/me')
      state.value.user = userData
      return userData
    } catch {
      state.value.token = null
      state.value.user = null
    }
  }

  return {
    user,
    authenticated,
    loading: computed(() => state.value.loading),
    login,
    register,
    logout,
    fetchUser,
  }
}
```

## Login Page Component

```vue
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Sign In</h1>
        <p class="mt-2 text-gray-600">Access your account</p>
      </div>

      <form @submit.prevent="handleLogin" class="mt-8 space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>

        <p class="text-center text-sm text-gray-600">
          Don't have an account?
          <NuxtLink to="/register" class="text-blue-600 hover:text-blue-500">
            Register
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const email = ref('')
const password = ref('')
const error = ref('')
const { login, loading } = useAuth()
const route = useRoute()

async function handleLogin() {
  error.value = ''
  const result = await login({
    email: email.value,
    password: password.value,
  })

  if (result.success) {
    const redirect = (route.query.redirect as string) ?? '/dashboard'
    navigateTo(redirect)
  } else {
    error.value = result.error ?? 'Login failed'
  }
}
</script>
```

## API Route Handler

```typescript
// server/api/auth/login.post.ts
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = loginSchema.safeParse(body)

  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: validated.error.errors.map(e => e.message).join(', '),
    })
  }

  const { email, password } = validated.data
  const user = await findUserByEmail(email)

  if (!user || !await verifyPassword(user.passwordHash, password)) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  const token = await generateToken({ userId: user.id, role: user.role })
  await setUserSession(event, { userId: user.id, role: user.role })

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
})

// server/api/auth/me.get.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session?.userId) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const user = await findUserById(session.userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role }
})
```

## Key Points

- Use definePageMeta with middleware for route protection
- Create auth composable wrapping state management and API calls
- Use Nuxt useCookie for secure token storage
- Implement login, register, logout with proper error handling
- Add guest middleware for login/register pages
- Handle token expiration with automatic redirect
- Use server routes for auth API endpoints
- Validate inputs with Zod on client and server
- Implement role-based access control in middleware
- Store session data securely using Nuxt session utilities
- Handle redirect after login preserving intended destination
- Clear auth state on logout both client and server side
