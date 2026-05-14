# Server Components

## Default: Server Component
```typescript
// page.tsx — Server Component by default (no 'use client')
async function OrdersPage() {
  const orders = await db.orders.findMany() // Direct DB access
  return (
    <div>
      <h1>Orders ({orders.length})</h1>
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  )
}
```

## When to Use 'use client'
- Browser APIs (localStorage, IntersectionObserver, etc.)
- Event listeners (onClick, onChange, onSubmit)
- React hooks (useState, useEffect, useContext)
- Custom hooks that use browser APIs

```typescript
'use client'

import { useState } from 'react'

export function OrderFilters() {
  const [status, setStatus] = useState('all')
  return (
    <select value={status} onChange={e => setStatus(e.target.value)}>
      <option value="all">All</option>
      <option value="pending">Pending</option>
    </select>
  )
}
```

## Server Component Benefits
- Zero JavaScript sent to client for pure rendering
- Direct access to databases, filesystems, APIs
- Automatic code splitting
- Smaller bundle size

## Composition Pattern
```typescript
// Server Component renders Client Component
import { OrderFilters } from './OrderFilters' // 'use client'

async function OrdersPage() {
  const orders = await getOrders()
  return (
    <div>
      <OrderFilters />    {/* Client Component — interactive */}
      <OrderList orders={orders} /> {/* Server Component — static */}
    </div>
  )
}
```
