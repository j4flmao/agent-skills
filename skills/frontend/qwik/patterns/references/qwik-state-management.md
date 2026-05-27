# Qwik State Management

## useStore Patterns

```typescript
import { component$, useStore, $ } from '@builder.io/qwik'

interface Todo {
  id: string
  text: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  filter: 'all' | 'active' | 'completed'
  draft: string
}

export const TodoApp = component$(() => {
  const state = useStore<TodoState>({
    todos: [],
    filter: 'all',
    draft: '',
  })

  const addTodo = $(() => {
    if (!state.draft.trim()) return
    state.todos = [
      ...state.todos,
      { id: crypto.randomUUID(), text: state.draft, completed: false },
    ]
    state.draft = ''
  })

  const toggleTodo = $((id: string) => {
    const todo = state.todos.find(t => t.id === id)
    if (todo) todo.completed = !todo.completed
  })

  const filteredTodos = () => {
    switch (state.filter) {
      case 'active': return state.todos.filter(t => !t.completed)
      case 'completed': return state.todos.filter(t => t.completed)
      default: return state.todos
    }
  }

  return (
    <div>
      <input
        value={state.draft}
        onInput$={(e) => state.draft = (e.target as HTMLInputElement).value}
        onKeyDown$={(e) => e.key === 'Enter' && addTodo()}
      />
      <button onClick$={addTodo}>Add</button>
      <div class="filters">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick$={() => state.filter = f}
            class={state.filter === f ? 'active' : ''}
          >
            {f}
          </button>
        ))}
      </div>
      <ul>
        {filteredTodos().map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange$={() => toggleTodo(todo.id)}
            />
            <span class={todo.completed ? 'completed' : ''}>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
})
```

## Server-Side State

```typescript
import { component$ } from '@builder.io/qwik'
import { routeLoader$, routeAction$ } from '@builder.io/qwik-city'

interface Session {
  user: { id: string; name: string; email: string }
  permissions: string[]
}

export const useSession = routeLoader$(async ({ cookie, redirect }) => {
  const token = cookie.get('auth-token')
  if (!token) throw redirect(302, '/login')

  const session = await validateToken(token.value)
  return session
})

export const useUpdateProfile = routeAction$(async (data, { cookie }) => {
  const token = cookie.get('auth-token')
  if (!token) return { success: false, error: 'Unauthorized' }

  await updateUser(token.value, data)
  return { success: true }
})

export default component$(() => {
  const session = useSession()
  const updateAction = useUpdateProfile()

  return (
    <div>
      <h1>Welcome, {session.value.user.name}</h1>
      {updateAction.value?.success && <p>Profile updated!</p>}
    </div>
  )
})
```

## Key Points

- Use useStore for complex reactive state objects
- Use useSignal for simple primitive values
- Use routeLoader$ for server-side data loading
- Use routeAction$ for server-side form handling
- Use useContext for component tree-scoped state
- Use useResource$ for async data with automatic tracking
- Avoid direct mutation of props in components
- Use $() to create lazy-loadable side effects
- Use track() inside useResource$ for reactive dependencies
- Leverage Qwik's fine-grained reactivity for performance
- Use useVisibleTask$ for browser-only state initialization
- Handle loading and error states with Resource component
