---
description: "j4flmao/rules — Mandatory database design standards (UUIDs, Indexing, Data Integrity)"
glob: "*"
---

# Database Design Standards

Cursor/AI MUST follow these rules when writing SQL, Prisma schemas, TypeORM entities, or Database migrations.

## 1. Primary Key Generation (Avoid Random UUIDv4 by Default)
- **Rule**: Do not use fully random `UUIDv4` as the primary key of a large, write-heavy relational table unless there is a stated reason.
- **Why**: Random keys insert into random B-tree leaf pages, which causes page splits, poor cache locality, and extra WAL/full-page writes. The cost is worst in clustered-index engines (MySQL InnoDB, SQL Server), where the table itself is ordered by the PK.
- **Action**: Use `BIGINT GENERATED ALWAYS AS IDENTITY` (PostgreSQL; preferred over `BIGSERIAL`), `UUIDv7` (time-ordered, RFC 9562; native `uuidv7()` in PostgreSQL 18+), `ULID`, or Snowflake-style IDs. If IDs are exposed publicly and must not leak volume or creation time, keep an internal sequential PK and a separate random public ID.

## 2. Soft Deletes via Timestamps, Not Booleans
- **Rule**: Avoid `is_deleted BOOLEAN` for soft deletes.
- **Action**: Use `deleted_at TIMESTAMPTZ NULL`. It records when the row was deleted and filters with `WHERE deleted_at IS NULL`. Keep uniqueness correct with a partial index: `CREATE UNIQUE INDEX ... ON users (email) WHERE deleted_at IS NULL;`.
- **Note**: Soft delete is not erasure. Data subject to GDPR/CCPA deletion requests still needs a hard-delete or anonymization path.

## 3. Rely on the Database for Integrity
- **Rule**: Never enforce data integrity only in application code. "Check if the username exists, then insert" is a race condition.
- **Action**: Use `NOT NULL`, `UNIQUE`, `FOREIGN KEY`, and `CHECK` constraints (e.g. `CHECK (price > 0)`). Handle the conflict atomically (`INSERT ... ON CONFLICT`, catch the unique-violation error) instead of pre-checking.

## 4. N+1 Query Prevention
- **Rule**: When fetching a list of entities and their children, you MUST batch the child loads: SQL `JOIN`s or `WHERE id = ANY($1)`, ORM eager loading (Prisma `include`, Django `select_related`/`prefetch_related`, SQLAlchemy `selectinload`, TypeORM `relations`), or `DataLoader` in GraphQL resolvers.
- **Rule**: Index every foreign key column used in joins or filters. PostgreSQL does not create these indexes automatically.
