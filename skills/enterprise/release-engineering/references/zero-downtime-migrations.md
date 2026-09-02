# Zero-Downtime Database Migrations

## 1. The Deployment vs. Schema Collision
In a traditional deployment, changing a database schema (e.g., renaming a column) requires taking the application offline. 
In modern Enterprise CD (Continuous Delivery), applications are updated via Rolling Updates. This means **Version 1.0 and Version 1.1 of the application are running simultaneously** against the same database for a few minutes.
If V1.1 runs an `ALTER TABLE RENAME COLUMN` script, the V1.0 instances immediately crash.

## 2. The Expand/Contract Pattern (Parallel Change)
To achieve zero-downtime, database changes must be backward and forward compatible. The "Expand/Contract" pattern breaks a destructive change (like renaming or splitting a column) into multiple safe deployments.

### Example: Renaming `first_name` to `full_name`

**Phase 1: Expand (Additive Schema Change)**
- **Schema**: Add the new `full_name` column (nullable). DO NOT delete `first_name`.
- **Code**: Update the application to write to *both* columns, but continue reading from `first_name`.
- *Deploy to production.* Both old and new app instances work perfectly.

**Phase 2: Migrate (Data Backfill)**
- **Operation**: Run a background SQL script to copy data from `first_name` to `full_name` for all existing rows.
```sql
UPDATE users SET full_name = first_name WHERE full_name IS NULL;
```

**Phase 3: Transition (Code Cutover)**
- **Code**: Update the application to read from `full_name` and write to `full_name`. (Writing to `first_name` can optionally be kept as a fallback).
- *Deploy to production.*

**Phase 4: Contract (Destructive Schema Change)**
- **Code**: Remove all references to `first_name` in the codebase.
- **Schema**: Run `ALTER TABLE users DROP COLUMN first_name;`
- *Deploy to production.* 

## 3. Rules for Enterprise Schema Changes
- **Never rename or delete a column/table in a single release.** Always use Expand/Contract.
- **Never add a `NOT NULL` column without a default value.** Older application instances won't know about this column and their `INSERT` statements will crash.
- **Beware of `SELECT *`**: Adding a column can break legacy code that uses `SELECT *` and expects a specific number of columns. Always explicitly name selected columns.
