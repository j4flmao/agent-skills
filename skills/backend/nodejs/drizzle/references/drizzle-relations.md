# Drizzle Relations Reference

## Defining Relations

Drizzle provides type-safe relation definitions between tables.

```typescript
import { pgTable, uuid, text, integer, timestamp, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
});
```

## Relation Declarations

```typescript
export const userRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
```

## Querying Relations

### One-to-Many

```typescript
import { db } from './db';
import { users, orders } from './schema';

const result = await db.query.users.findMany({
  with: {
    orders: {
      columns: { id: true, status: true, total: true },
      limit: 10,
    },
  },
});
```

### Many-to-One

```typescript
const result = await db.query.orders.findMany({
  with: {
    user: {
      columns: { name: true, email: true },
    },
    items: true,
  },
  where: (orders, { eq }) => eq(orders.status, 'pending'),
});
```

### Nested Relations

```typescript
const result = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, userId),
  with: {
    orders: {
      with: {
        items: {
          columns: { sku: true, quantity: true, price: true },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    },
  },
});
```

## Prepared Statements with Relations

```typescript
import { sql } from 'drizzle-orm';

const getOrderWithDetails = db.query.orders
  .findFirst({
    where: (orders, { eq }) => eq(orders.id, sql.placeholder('id')),
    with: {
      user: true,
      items: true,
    },
  })
  .prepare('get_order_with_details');

const order = await getOrderWithDetails.execute({ id: 'some-uuid' });
```

## Self-Referencing Relations

```typescript
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
});

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
}));
```

## Many-to-Many Relations

```typescript
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
});

export const productCategories = pgTable('product_categories', {
  productId: uuid('product_id').notNull().references(() => products.id),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
});

export const productRelations = relations(products, ({ many }) => ({
  categories: many(productCategories),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(productCategories),
}));

export const productCategoryRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));
```

## Key Points

- Relations are defined separately from table schemas
- `one()` defines belongs-to / has-one associations
- `many()` defines has-many associations
- Foreign keys should reference primary keys with `references()`
- Nested `with` clauses support unlimited depth
- Prepared statements optimize repeated relation queries
- Self-referencing relations support hierarchies
- Many-to-many requires a junction table with two one-to-many relations
- `columns` option filters fields in related data
- `orderBy` and `limit` apply to relation sub-queries
