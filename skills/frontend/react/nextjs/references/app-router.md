# Next.js App Router

## Route Convention
```
app/
├── page.tsx            → /
├── layout.tsx          → Root layout
├── loading.tsx         → Loading UI
├── error.tsx           → Error boundary
├── not-found.tsx       → 404
├── orders/
│   ├── page.tsx        → /orders
│   ├── loading.tsx     → Loading for /orders
│   └── [id]/
│       ├── page.tsx    → /orders/123
│       └── not-found.tsx
└── api/
    └── orders/
        └── route.ts    → /api/orders
```

## Layouts
```typescript
// app/layout.tsx — root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}

// app/orders/layout.tsx — nested layout
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <OrdersSidebar />
      {children}
    </section>
  )
}
```

## Data Fetching
```typescript
// Server Component — fetch directly
async function OrdersPage() {
  const orders = await fetch('http://api/orders').then(r => r.json())
  return <OrderList orders={orders} />
}

// With cache and revalidation
async function getOrders() {
  const res = await fetch('http://api/orders', { next: { revalidate: 60 } })
  return res.json()
}
```

## Route Handlers
```typescript
// app/api/orders/route.ts
export async function GET(request: NextRequest) {
  const orders = await db.orders.findMany()
  return NextResponse.json(orders)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const order = await db.orders.create({ data: body })
  return NextResponse.json(order, { status: 201 })
}
```
