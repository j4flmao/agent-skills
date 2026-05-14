# React Component Patterns

## Smart vs Dumb Components

### Smart (Container)
- Fetches data, manages state, handles events
- Located in `pages/` or `features/X/components/`
- Uses hooks, connects to stores

```typescript
function OrdersPage() {
  const { data: orders, isLoading } = useOrders()
  const createOrder = useCreateOrder()

  if (isLoading) return <Spinner />
  return <OrderList orders={orders} onCreateOrder={createOrder.mutate} />
}
```

### Dumb (Presentational)
- Receives props, renders UI
- No data fetching, no direct store access

```typescript
function OrderList({ orders, onCreateOrder }: OrderListProps) {
  return (
    <div>
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
      <Button onClick={onCreateOrder}>New Order</Button>
    </div>
  )
}
```

## Composition over Props Drilling
```typescript
// BAD — props drilling
<Page>
  <Header user={user} onLogin={handleLogin} />
  <Main user={user} onLogin={handleLogin}>
    <Content user={user} onLogin={handleLogin} />
  </Main>
</Page>

// GOOD — composition
function Page() {
  return (
    <AuthProvider>
      <Header>
        <LoginButton />
      </Header>
      <Main>
        <Content />
      </Main>
    </AuthProvider>
  )
}
```

## Compound Component
```typescript
function Select({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <SelectContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

Select.Trigger = function Trigger({ children }: { children: React.ReactNode }) {
  const { setOpen } = useSelectContext()
  return <button onClick={() => setOpen(true)}>{children}</button>
}

Select.Options = function Options({ children }: { children: React.ReactNode }) {
  const { open } = useSelectContext()
  return open ? <div className="absolute top-full">{children}</div> : null
}
```
