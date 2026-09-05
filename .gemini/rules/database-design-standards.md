---
description: "j4flmao/rules — Mandatory database design standards (UUIDs, Indexing, Data Integrity)"
glob: "*"
---

# Database Design Standards

Cursor/AI MUST follow these rules when writing SQL, Prisma schemas, TypeORM entities, or Database migrations.

## 1. Primary Key Generation (The UUIDv4 Ban)
- **Rule**: NEVER use `UUIDv4` (fully random UUIDs) as a Primary Key in a relational database (PostgreSQL, MySQL).
- **Why**: B-Tree storage engines suffer massive fragmentation (Page Splits) when inserting non-sequential random data.
- **Action**: Use sequential IDs (e.g., `BIGSERIAL`), `UUIDv7` (time-ordered), `ULID`, or Snowflake IDs.

## 2. No Soft Deletes via Booleans
- **Rule**: Avoid `is_deleted = boolean` for soft deletes in high-scale tables.
- **Action**: Use `deleted_at = TIMESTAMP`. It provides audibility (when was it deleted) and can still be easily filtered (`WHERE deleted_at IS NULL`).

## 3. Rely on the Database for Integrity
- **Rule**: Never enforce data integrity solely in application code (e.g., checking if a username exists before inserting).
- **Action**: Use `UNIQUE` constraints, `FOREIGN KEY` constraints, and `CHECK` constraints (e.g., `CHECK (price > 0)`). Let the Database enforce ACID guarantees.

## 4. N+1 Query Prevention
- **Rule**: When generating ORM code or raw SQL to fetch a list of entities and their children, you MUST proactively implement batching (e.g., `DataLoader`) or SQL `JOIN`s to prevent N+1 query loops.
