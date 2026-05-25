# Composition Patterns

## Component Composition Hierarchy

```
                   ┌──────────────┐
                   │   Provider   │  ← Shared data context
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │    Layout    │  ← Structural components
                   └──────┬───────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │  Container  │ │  Container  │ │  Container  │  ← Data + logic
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
          │               │               │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │Presentational│ │Presentational│ │Presentational│  ← Pure rendering
   └─────────────┘ └─────────────┘ └─────────────┘
```

## Compound Components

```tsx
// Context for shared state
interface TabsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>')
  return ctx
}

// Root provider
function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  )
}

// Sub-components
function TabList({ children }: { children: React.ReactNode }) {
  return <div className="tabs-list" role="tablist">{children}</div>
}

function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabs()
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      className={activeTab === value ? 'active' : ''}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  )
}

function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabs()
  if (activeTab !== value) return null
  return <div role="tabpanel">{children}</div>
}

// Attach sub-components to root
Tabs.List = TabList
Tabs.Tab = Tab
Tabs.Panel = TabPanel

// Usage
<Tabs defaultTab="orders">
  <Tabs.List>
    <Tabs.Tab value="orders">Orders</Tabs.Tab>
    <Tabs.Tab value="products">Products</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="orders"><OrderList /></Tabs.Panel>
  <Tabs.Panel value="products"><ProductList /></Tabs.Panel>
</Tabs>
```

## Component Injection

```tsx
// Inverted control via component injection
interface TableProps<T> {
  data: T[]
  RowComponent: React.ComponentType<{ item: T }>
  HeaderComponent?: React.ComponentType
}

function Table<T>({ data, RowComponent, HeaderComponent }: TableProps<T>) {
  return (
    <table>
      {HeaderComponent && <HeaderComponent />}
      <tbody>
        {data.map((item, i) => (
          <RowComponent key={i} item={item} />
        ))}
      </tbody>
    </table>
  )
}
```

## Render Props

```tsx
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  return (
    <div onMouseMove={e => setPosition({ x: e.clientX, y: e.clientY })}>
      {render(position)}
    </div>
  )
}

// Usage
<MouseTracker>
  {({ x, y }) => <div>Mouse at {x}, {y}</div>}
</MouseTracker>
```

## Polymorphic Component

```tsx
// Component that renders as different HTML elements
interface TextProps {
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'label'
  children: React.ReactNode
  className?: string
}

function Text({ as: Tag = 'p', children, className }: TextProps) {
  return <Tag className={className}>{children}</Tag>
}

// Usage
<Text as="h1">Heading</Text>
<Text as="span">Inline text</Text>
```

## Wrapper/Decorator Pattern

```tsx
// Wrap children with common behavior
function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="card" onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  )
}

// Nested wrappers for layout
function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-layout">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
```

## Composition vs Configuration Decision

```
Approach for reusable component?
├── Props change appearance?
│   ├── 2-3 variants → CVA variants (configuration)
│   └── Open-ended → Slots / children (composition)
├── Parts need reordering?
│   └── Compound components (composition)
├── Consumer controls rendering logic?
│   └── Render delegation (composition)
├── Simple visual changes only?
│   └── Props + className (configuration)
└── Both needed?
    └── Compound component + props (hybrid)
```

## Composition Guidelines

| Principle | Implementation |
|-----------|---------------|
| Prefer composition over inheritance | Use children, slots, render props |
| One component = one file | Split at composition boundaries |
| Props describe what, children describe how | Configuration vs composition |
| Compound components for multi-part UI | Shared context between parts |
| Provider at nearest common ancestor | Avoid wrapping entire app unnecessarily |
| Max 3 levels of nesting in JSX | Extract into named components |
| Children can be any renderable | `React.ReactNode` type |
