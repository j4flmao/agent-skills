# Rendering Patterns

## Conditional Rendering Patterns

```tsx
// Pattern 1: Ternary (preferred for simple branching)
function UserStatus({ user }: { user: User | null }) {
  return (
    <div>
      {user ? <UserProfile user={user} /> : <LoginButton />}
    </div>
  )
}

// Pattern 2: Short-circuit (when nothing renders on false)
function Notifications({ count }: { count: number }) {
  return (
    <div>
      {count > 0 && <Badge count={count} />}
    </div>
  )
}

// Pattern 3: Switch/match (for multiple states)
function AsyncData<T>({ state }: { state: AsyncState<T> }) {
  switch (state.status) {
    case 'loading':
      return <Spinner />
    case 'error':
      return <ErrorState message={state.error} />
    case 'success':
      return <DataView data={state.data} />
    default:
      return null
  }
}
```

## List Rendering

```tsx
// Always provide stable keys
function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>  {/* stable, unique key */}
          {item.name}
        </li>
      ))}
    </ul>
  )
}

// Key rules:
// 1. Use unique ID from data — never index unless static list
// 2. Key must be stable across re-renders
// 3. Key must be unique among siblings

// Virtualized list for large datasets
import { FixedSizeList } from 'react-window'

function VirtualList({ items }: { items: Item[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  )
}
```

## Composition Pattern

```tsx
// Slot-based composition
interface CardProps {
  title: React.ReactNode
  description: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
}

function Card({ title, description, actions, footer }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <div className="card-body">{description}</div>
      {actions && <div className="card-actions">{actions}</div>}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  )
}

// Usage
<Card
  title={<h2>Welcome</h2>}
  description={<p>Hello, world</p>}
  actions={<Button>Learn More</Button>}
  footer={<small>Updated today</small>}
/>
```

## Portal Pattern

```tsx
import { createPortal } from 'react-dom'

function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body  // render outside component tree
  )
}
```

## Render Delegation

```tsx
interface DataTableProps<T> {
  data: T[]
  columns: {
    header: string
    render: (item: T) => React.ReactNode
    width?: string
  }[]
}

function DataTable<T>({ data, columns }: DataTableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => <th key={col.header}>{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((item, i) => (
          <tr key={i}>
            {columns.map(col => (
              <td key={col.header}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Usage — consumer controls rendering
<DataTable
  data={users}
  columns={[
    { header: 'Name', render: (u) => <strong>{u.name}</strong> },
    { header: 'Email', render: (u) => u.email },
    { header: 'Actions', render: (u) => <Button onClick={() => edit(u.id)}>Edit</Button> },
  ]}
/>
```

## Layout Patterns

```tsx
// Split layout
function SplitLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

// Sidebar layout
function SidebarLayout({ sidebar, main }: { sidebar: React.ReactNode; main: React.ReactNode }) {
  return (
    <div className="flex">
      <aside className="w-64 shrink-0">{sidebar}</aside>
      <main className="flex-1 min-w-0">{main}</main>
    </div>
  )
}

// Stack layout
function VStack({ children, gap = 4 }: { children: React.ReactNode; gap?: number }) {
  return <div className={`flex flex-col gap-${gap}`}>{children}</div>
}

function HStack({ children, gap = 4 }: { children: React.ReactNode; gap?: number }) {
  return <div className={`flex items-center gap-${gap}`}>{children}</div>
}
```

## High-Order Component Pattern

```tsx
function withLogging<P>(Component: React.ComponentType<P>) {
  return function LoggedComponent(props: P) {
    useEffect(() => {
      console.log(`Component ${Component.displayName || Component.name} mounted`)
      return () => console.log(`Component unmounted`)
    }, [])

    return <Component {...props} />
  }
}

const LoggedDashboard = withLogging(Dashboard)
```

## Pattern Selection Decision

```
Rendering need?
├── Depends on data → Conditional (ternary/switch)
├── Multiple items → List (.map + key)
├── Large list (>1000) → Virtualized
├── Reusable structure → Composition (slots)
├── Modal/tooltip → Portal
├── Consumer controls UI → Render delegation
├── Cross-cutting concern → HOC
├── Layout structure → Layout components
└── Shared state pattern → Provider/Context
```
