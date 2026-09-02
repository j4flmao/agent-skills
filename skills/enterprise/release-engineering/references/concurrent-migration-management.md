# Concurrent Schema Management (Flyway / Liquibase)

## 1. The Version Collision Problem
When the Global R&D team and the Department team work in parallel branches, they both generate database migration scripts.
- Global creates: `V104__add_global_settings.sql`
- Department creates: `V104__add_department_poc_table.sql`

When the Department merges its PoC into `main`, the migration tool (Flyway/Liquibase) will detect duplicate `V104` versions. The CI pipeline will fail, or worse, production startup will crash.

## 2. Solution 1: Timestamp-Based Versioning
Never use sequential integers (`V1`, `V2`, `V3`) in a distributed team. Always use UTC timestamps to guarantee uniqueness and natural chronological ordering.

- **Global**: `V20260902103000__add_global_settings.sql`
- **Department**: `V20260902141500__add_poc_table.sql`

*Best Practice*: Your framework or IDE should auto-generate these prefixes.

## 3. Solution 2: Out-Of-Order Execution
Even with timestamps, a problem arises when a Department branch lives for 3 weeks.
1. Dept branch creates migration: `V20260801...`
2. Global creates and merges migration: `V20260815...` (Currently deployed on Prod).
3. Dept merges their 3-week-old branch. The tool sees `V20260801...` is missing from the database, but it's *older* than the latest run migration.

By default, Flyway rejects older scripts. To fix this, enable **Out of Order** execution.
```properties
# flyway.conf
flyway.outOfOrder=true
```
This tells Flyway: "If you find a missing older script, run it now, as long as its checksum hasn't changed."
*Warning*: Out-of-order execution is only safe if the Department and Global scripts do not touch the exact same tables.

## 4. Solution 3: Schema Isolation (Bounded Contexts)
The ultimate defense against concurrent schema collisions is ensuring the Department PoC does not use the Global schema in the first place.
- **Physical Isolation**: Deploy the PoC with its own database instance.
- **Logical Isolation**: In Postgres, use a dedicated schema: `CREATE SCHEMA department_poc;`. The Department maintains its own isolated Flyway history table (`flyway_schema_history_poc`).

By isolating the schema, the Department can drop, recreate, and experiment without ever blocking Global R&D deployments.
