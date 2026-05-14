---
name: vue-architecture
description: >
  Use this skill when the user says 'Vue structure', 'Vue architecture', 'Vue 3 folder', 'Composition API architecture', 'Vue clean arch', 'Vue feature structure', 'Pinia architecture', 'Vue project layout', or when structuring a Vue 3 application. This skill enforces: feature-based folder structure, script setup always, Composition API with composables (useX naming), Pinia for global state, one concern per composable, scoped styles by default, and component file under 200 lines. Requires Vue 3 (vue package). Do NOT use for: Nuxt-specific features, Vue 2 Options API, or React/Angular.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, vue, phase-3]
---

# Vue Architecture

## Purpose
Structure Vue 3 applications with Composition API, feature-based folders, and Pinia stores. All logic in composables. script setup always.

## Agent Protocol

### Trigger
Exact user phrases: "Vue structure", "Vue architecture", "Vue 3 folder", "Composition API architecture", "Vue clean arch", "Vue feature structure", "Pinia architecture", "Vue project layout".

### Input Context
Before activating, verify:
- package.json has vue dependency (version 3).
- Whether the project uses Vite or Vue CLI.

### Output Artifact
No file output. Produces folder structure and Vue component code as text.

### Response Format
Folder structure:
```
src/
  features/{feature}/
    composables/, components/
  shared/components/
  stores/
```

Code: show <script setup> and <template>. No <style> block.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Folder structure is feature-based (src/features/{feature}).
- [ ] All .vue files use <script setup lang="ts"> syntax.
- [ ] All reusable logic is in composables (useX naming), not in mixins.
- [ ] Pinia stores for global state, composables for reusable logic, components for UI.
- [ ] Props and emits have full TypeScript types.
- [ ] Styles are scoped by default (scoped attribute).
- [ ] Components are under 200 lines.

### Max Response Length
Folder structure: unlimited. Code: 20 lines per example.

## Workflow

### Step 1: Feature-Based Structure
```
src/
  main.ts
  App.vue
  router/
    index.ts
  stores/
    auth.store.ts              -- Pinia stores
    user.store.ts
  features/
    users/
      composables/
        useUsers.ts            -- Feature-specific composable
        useUserFilter.ts
      components/
        UserList.vue
        UserCard.vue
      api/
        userApi.ts
      types/
        index.ts
    orders/
      composables/
      components/
      api/
      types/
  shared/
    components/                 -- Pure UI components
      UiButton.vue
      UiModal.vue
      UiDataTable.vue
    composables/                -- Generic composables
      useDebounce.ts
      useMediaQuery.ts
    utils/
      formatDate.ts
  assets/
```

### Step 2: Composition API Component
```vue
<script setup lang="ts">
const { users, isLoading, error, refresh } = useUsers()

const props = defineProps<{
  userId: string
  variant?: 'card' | 'list'
}>()

const emit = defineEmits<{
  select: [userId: string]
  delete: [userId: string]
}>()

const displayName = computed<string>(() => {
  return props.variant === 'card'
    ? `${users.value?.[0]?.name}`
    : 'List view'
})
</script>

<template>
  <div @click="emit('select', props.userId)">
    <p>{{ displayName }}</p>
  </div>
</template>
```

### Step 3: Composable Design
```typescript
// composables/useUsers.ts
import { ref, computed, type Ref } from 'vue'
import { api } from '@/shared/api'

interface UseUsersReturn {
  users: Ref<User[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
}

export function useUsers(filters?: Ref<UserFilters>): UseUsersReturn {
  const users = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      users.value = await api.getUsers(filters?.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  return { users, isLoading, error, refresh }
}
```

### Step 4: Pinia Store
```typescript
// stores/auth.store.ts
import { defineStore } from 'pinia'

interface AuthState {
  user: User | null
  token: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role ?? 'guest',
  },
  actions: {
    async login(email: string, password: string) {
      const { user, token } = await api.login(email, password)
      this.user = user
      this.token = token
    },
    logout() {
      this.user = null
      this.token = null
      router.push('/login')
    },
  },
})
```

### Step 5: Component Organization Rules
- One component per file.
- Under 200 lines. If larger, extract sub-components.
- scoped styles by default. Global styles only for CSS custom properties in App.vue.
- Avoid deep selectors (>>> or :deep). Pass CSS classes as props instead.

## Rules
- script setup always. No Options API in new code.
- All reusable logic in composables. Naming: useX. Return only what the template needs.
- Pinia stores for global state. Composables for reusable logic. Components for presentation.
- Props and emits have full TypeScript types. No runtime-only prop validation.
- Avoid provide/inject for data that can be prop-drilled one level deep.
- Never mutate props. Use emit to communicate changes to the parent.

## References
- `references/composition-api.md` — composable naming, lifecycle, reactivity
- `references/folder-structure.md` — Vue feature-based folder structure

## Handoff
No artifact produced.
Next skill: vue-nuxt (if using Nuxt) or frontend-testing.
Carry forward: component organization, composable patterns, Pinia store structure.
