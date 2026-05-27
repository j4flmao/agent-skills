# Prisma Relations Reference

## Defining Relations

Prisma schema supports one-to-one, one-to-many, and many-to-many relations.

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  profile   Profile?
  orders    Order[]
  createdAt DateTime @default(now())
}

model Profile {
  id     String @id @default(uuid())
  bio    String
  avatar String?
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}

model Order {
  id         String      @id @default(uuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  items      OrderItem[]
  status     OrderStatus @default(PENDING)
  total      Float
  createdAt  DateTime    @default(now())
}

model OrderItem {
  id      String @id @default(uuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id])
  sku     String
  quantity Int
  price   Float
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
}
```

## Querying Relations

### Include Relations

```typescript
// Eager loading
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: true,
    orders: {
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});
```

### Nested Include

```typescript
const order = await prisma.order.findFirst({
  where: { id: orderId },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    items: {
      select: {
        sku: true,
        quantity: true,
        price: true,
      },
    },
  },
});
```

### Filtered Relations

```typescript
// Filter relations during query
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    orders: {
      where: { status: 'PENDING' },
      include: {
        items: {
          where: { quantity: { gt: 0 } },
        },
      },
    },
  },
});
```

## Relational Queries with Fluent API

```typescript
const userOrders = await prisma.user
  .findUnique({ where: { id: userId } })
  .orders({
    where: { status: 'CONFIRMED' },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
```

## Creating with Relations

```typescript
// Create with nested write
const order = await prisma.order.create({
  data: {
    user: { connect: { id: userId } },
    status: 'PENDING',
    total: 99.99,
    items: {
      create: [
        { sku: 'SKU-001', quantity: 2, price: 29.99 },
        { sku: 'SKU-002', quantity: 1, price: 39.99 },
      ],
    },
  },
  include: {
    items: true,
  },
});
```

## Updating Relations

```typescript
// Update with relation operations
const updatedOrder = await prisma.order.update({
  where: { id: orderId },
  data: {
    status: 'CONFIRMED',
    items: {
      deleteMany: { sku: 'SKU-001' },
      create: { sku: 'SKU-003', quantity: 1, price: 19.99 },
      updateMany: {
        where: { sku: 'SKU-002' },
        data: { quantity: 3 },
      },
    },
  },
  include: { items: true },
});
```

## Many-to-Many Relations

```prisma
model Product {
  id          String           @id @default(uuid())
  name        String
  categories  ProductCategory[]
}

model Category {
  id       String           @id @default(uuid())
  name     String
  products ProductCategory[]
}

model ProductCategory {
  productId  String
  categoryId String
  product    Product  @relation(fields: [productId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])

  @@id([productId, categoryId])
}
```

### Query Many-to-Many

```typescript
const products = await prisma.product.findMany({
  where: {
    categories: {
      some: { category: { name: 'Electronics' } },
    },
  },
  include: {
    categories: {
      include: { category: true },
    },
  },
});
```

## Relation Count

```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    _count: {
      select: { orders: true },
    },
  },
});
```

## Relation Mode (Foreign Keys)

```prisma
// MongoDB uses NO action for relation mode
model Post {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  authorId String @db.ObjectId
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
}
```

## Key Points

- Relations are declared with `@relation` directive referencing foreign keys
- `include` eagerly loads related data in a single query
- `select` filters fields in related models
- Filtered relations narrow related data per query
- Fluent API chains relation traversal
- Nested creates insert related records atomically
- Connect/disconnect operations link existing records
- Many-to-many uses a junction table with compound key
- `_count` returns relation counts without loading data
- Referential actions (cascade, restrict) control deletion behavior
