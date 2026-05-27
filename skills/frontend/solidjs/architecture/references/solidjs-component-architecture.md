# SolidJS Component Architecture

## Component Composition

```typescript
import { Component, JSX, splitProps } from 'solid-js'

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, [
    'variant', 'size', 'loading', 'children',
  ])

  const variantClasses = {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-200 text-gray-900',
    ghost: 'text-gray-700 hover:bg-gray-100',
  }

  return (
    <button
      class={`btn ${variantClasses[local.variant || 'primary']}`}
      disabled={local.loading || others.disabled}
      {...others}
    >
      {local.loading && <Spinner />}
      {local.children}
    </button>
  )
}

function Card(props: {
  header?: JSX.Element
  children: JSX.Element
  footer?: JSX.Element
}) {
  return (
    <div class="card">
      {props.header && <div class="card-header">{props.header}</div>}
      <div class="card-body">{props.children}</div>
      {props.footer && <div class="card-footer">{props.footer}</div>}
    </div>
  )
}
```

## Portal and Teleport

```typescript
import { Portal } from 'solid-js/web'

function Modal(props: { isOpen: () => boolean; onClose: () => void }) {
  let dialogRef: HTMLDialogElement

  createEffect(() => {
    if (props.isOpen()) {
      dialogRef?.showModal()
    } else {
      dialogRef?.close()
    }
  })

  return (
    <Portal>
      <dialog ref={dialogRef} onClose={props.onClose}>
        <slot />
        <button onClick={props.onClose}>Close</button>
      </dialog>
    </Portal>
  )
}
```

## Error Boundary

```typescript
import { ErrorBoundary, Component } from 'solid-js'

function App() {
  return (
    <ErrorBoundary fallback={(err, reset) => (
      <div class="error-container">
        <h2>Something went wrong</h2>
        <p>{err.message}</p>
        <button onClick={reset}>Try again</button>
      </div>
    )}>
      <UserDashboard />
    </ErrorBoundary>
  )
}
```

## Key Points

- Use splitProps for separating component-specific from DOM props
- Compose components with JSX.Element children and slots
- Use Portal for modals, tooltips, and overlays
- Implement ErrorBoundary for graceful error recovery
- Use Dynamic component for polymorphic rendering
- Leverage SolidJS's no-VDOM approach for performance
- Use event delegation with on: prefixed events
- Handle refs with let: directive for forward refs
- Use <Show> for conditional rendering
- Use <Switch>/<Match> for multiple conditions
- Use <For> with stable keys for list rendering
- Use <Index> when keys are not appropriate
