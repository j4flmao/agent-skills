# Module Federation

## Host Configuration

```typescript
import { defineConfig } from 'vite'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    federation({
      name: 'host',
      remotes: {
        remoteApp: 'http://localhost:5001/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', '@tanstack/react-query'],
    }),
  ],
  build: {
    target: 'esnext',
  },
})
```

## Remote Configuration

```typescript
import { defineConfig } from 'vite'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    federation({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button.tsx',
        './Header': './src/components/Header.tsx',
        './store': './src/store/index.ts',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
  },
})
```

## Consuming Remote Components

```typescript
import { lazy } from 'react'
import type { ComponentType } from 'react'

interface RemoteComponentProps {
  buttonText: string
  onClick: () => void
}

const RemoteButton = lazy<ComponentType<RemoteComponentProps>>(
  () => import('remoteApp/Button')
)

function HostApp() {
  return (
    <Suspense fallback={<div>Loading remote component...</div>}>
      <RemoteButton
        buttonText="Click me"
        onClick={() => console.log('Clicked')}
      />
    </Suspense>
  )
}
```

## Shared State

```typescript
// Shared store exposed by remote
import { createStore } from 'shared/store'
import { Provider, useSelector, useDispatch } from 'react-redux'

interface SharedState {
  user: User | null
  theme: 'light' | 'dark'
}

const store = createStore<SharedState>({
  reducer: {
    user: userReducer,
    theme: themeReducer,
  },
})

function App() {
  return (
    <Provider store={store}>
      <HostApp />
    </Provider>
  )
}
```

## Key Points

- Configure Module Federation for micro-frontend architectures
- Share common dependencies to avoid duplication
- Expose components and stores from remote apps
- Use lazy loading for remote components
- Handle loading states with Suspense boundaries
- Implement error boundaries for remote component failures
- Share version constraints to prevent conflicts
- Use consistent dependency versions across micro-frontends
- Configure fallback URLs for remote availability
- Implement authentication boundary at shell level
- Test cross-micro-frontend communication
- Monitor remote loading performance metrics
