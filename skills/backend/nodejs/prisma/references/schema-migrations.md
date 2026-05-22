# Schema & Migrations

## Schema Design Principles

### Naming Conventions
- Models: PascalCase, singular (`User`, `OrderItem`)
- Fields: camelCase (`createdAt`, `authorId`)
- Enums: PascalCase (`OrderStatus`, `Role`)
- Relation fields: model name camelCase (`author`, `customer`)
- Foreign keys: model name camelCase + `Id` (`authorId`, `customerId`)

### Field Types

| Prisma Type | PostgreSQL | Use Case |
|------------|-----------|----------|
| `String` | `text` | Names, emails, IDs |
| `String @id @default(uuid())` | `uuid` | Primary keys |
| `String @id @default(cuid())` | `text` | Alternative PK |
| `Int` | `integer` | Counts, ages |
| `Float` | `double precision` | Non-precise decimals |
| `Decimal` | `decimal(65,30)` | Money, precise math |
| `Boolean` | `boolean` | Flags |
| `DateTime` | `timestamp(3)` | Timestamps |
| `Json` | `jsonb` | Dynamic data |
| `Bytes` | `bytea` | Binary data |
| `BigInt` | `bigint` | Large numbers |

### Attribute Reference

```prisma
model Example {
  id        String   @id @default(uuid()) @db.Uuid
  uniqueCol String   @unique
  mapCol    String   @map("mapped_column_name")
  default   Int      @default(0)
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
  @@map("table_name")         // Map model to table name
  @@index([field1, field2])   // Composite index
  @@unique([field1, field2])  // Composite unique
}
```

## Relation Types

### 1:1
```prisma
model User {
  id      String    @id @default(uuid())
  profile Profile?
}

model Profile {
  id     String @id @default(uuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}
```

### 1:N (standard)
```prisma
model Customer {
  id     String  @id @default(uuid())
  orders Order[]
}

model Order {
  id         String   @id @default(uuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
}
```

### M:N (implicit — no extra fields)
```prisma
model Post {
  id       String  @id @default(uuid())
  authors  Author[]
}

model Author {
  id    String @id @default(uuid())
  posts Post[]
}
// Prisma creates _PostToAuthor junction table automatically
```

### M:N (explicit — with extra fields)
```prisma
model Student {
  id        String             @id @default(uuid())
  name      String
  enrollments Enrollment[]
}

model Course {
  id          String       @id @default(uuid())
  title       String
  enrollments Enrollment[]
}

model Enrollment {
  studentId String
  courseId  String
  enrolledAt DateTime @default(now())
  grade      String?
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@id([studentId, courseId])
}
```

### Self-referential
```prisma
model Category {
  id       String     @id @default(uuid())
  name     String
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
}
```

## Migration Commands

```bash
# Development
npx prisma migrate dev --name describe-change    # Create + apply migration
npx prisma migrate dev --create-only              # Create without applying
npx prisma migrate reset                          # Drop + recreate + seed

# Production
npx prisma migrate deploy                         # Apply pending migrations
npx prisma migrate status                         # Check migration status
npx prisma migrate diff                           # Diff schema with DB

# Utility
npx prisma generate                               # Regenerate client
npx prisma validate                               # Validate schema
npx prisma format                                 # Format schema file
npx prisma studio                                 # Open data browser
```

### Migration Best Practices

1. Always review generated SQL before applying
2. Never edit migration files manually — create new migration instead
3. Run `prisma migrate dev` locally, commit migration folder
4. Run `prisma migrate deploy` in CI/CD
5. Use `prisma migrate diff` + `prisma db execute` for custom SQL migrations
6. For production schema changes on large tables:
   - Add nullable columns first (separate migration)
   - Backfill data
   - Make column required (second migration)

### Common Migration Patterns

```bash
# Adding a column with default
npx prisma migrate dev --name add-user-avatar
# In schema:
model User {
  avatarUrl String?  # nullable — won't break existing rows
}

# Renaming a field (data-preserving)
# 1. Add new field
# 2. Write data migration
# 3. Remove old field
npx prisma migrate dev --name migrate-username-to-handle
```

## Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      posts: {
        create: [
          { title: 'Hello World', published: true },
          { title: 'Second Post', published: false },
        ],
      },
    },
  });

  // Bulk insert
  const products = Array.from({ length: 100 }, (_, i) => ({
    name: `Product ${i + 1}`,
    price: Math.random() * 100,
    stock: Math.floor(Math.random() * 1000),
  }));

  await prisma.product.createMany({ data: products });

  console.log({ alice });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Referential Integrity

```prisma
// For databases that support FK constraints (PostgreSQL, MySQL)
datasource db {
  provider             = "postgresql"
  url                  = env("DATABASE_URL")
  referentialIntegrity = "prisma"  // default — Prisma handles FK logic
}
```

OnDelete options:
- `Cascade` — delete child when parent deleted
- `Restrict` — prevent parent delete if children exist
- `NoAction` — no action (DB default)
- `SetNull` — set FK to null on parent delete
- `SetDefault` — set FK to default on parent delete

## Schema Validation

```bash
npx prisma validate
# Output: Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# Schema is up to date — no pending migrations
```

## Multi-file Schema

Prisma supports splitting schema across multiple files:

```prisma
// prisma/schema/main.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

// prisma/schema/user.prisma
model User {
  id   String @id @default(uuid())
  name String
}

// prisma/schema/post.prisma
model Post {
  id       String @id @default(uuid())
  title    String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}
```

Update generator path in `main.prisma`:
```prisma
generator client {
  provider        = "prisma-client-js"
  schemaFilePath  = "../"
}
```
