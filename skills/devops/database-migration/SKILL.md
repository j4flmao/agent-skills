---
name: database-migration
description: >
  Use this skill when the user says 'database migration', 'schema migration',
  'DB migration', 'Flyway', 'Liquibase', 'Alembic', 'Prisma Migrate',
  'DMS', 'AWS DMS', 'Azure DMS', 'Database Migration Service',
  'zero-downtime migration', 'online migration', 'offline migration',
  'homogeneous migration', 'heterogeneous migration', 'schema drift'.
  Covers: schema migration tools, online/offline migration strategies,
  homogeneous and heterogeneous migrations, zero-downtime deployments,
  migration rollback, testing, and validation.
  Do NOT use for: general cloud migration (use cloud-migration skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, database-migration, schema, phase-5]
---

# Database Migration

## Purpose
Plan and execute database migrations including schema changes, cross-engine migration, zero-downtime deployments, and rollback strategies.

## Architecture Decision Trees

### Online vs Offline Migration
| Factor | Offline | Online (CDC) |
|---|---|---|
| Downtime | Hours (full lock) | Minutes or zero |
| Complexity | Low | High |
| Data volume | Any | Any |
| Consistency | Guaranteed (locked) | Eventual (CDC catch-up) |
| Rollback | Snapshot restore | Reverse CDC |
| Tooling | pg_dump/mysqldump | DMS, Debezium, GoldenGate |
| Best for | <50GB, maintenance window | Large DBs, 24/7 apps |

### Schema Migration Tool Comparison
| Tool | Language | Versioning | Rollback | CI/CD | Best For |
|---|---|---|---|---|---|
| Flyway | Java/SQL | Sequential files | Undo (limited) | Excellent | Java shops, simple |
| Liquibase | Java/XML/YAML/JSON | Changelog tracking | rollback<count> | Excellent | Complex, multi-DB |
| Alembic | Python | Auto-generation | downgrade() | Good | Python/Flask apps |
| Prisma Migrate | TypeScript | Shadow DB | migration down | Good | Node.js/TS apps |
| Sqitch | Perl | Tag-based | revert | Good | Multi-language teams |
| goose | Go | Sequential | down | Good | Go services |
| gormigrate | Go | Migration structs | Rollback | Medium | Go + GORM apps |

### Tool Selection Decision
```
What language does the application use?
├── Java/JVM → Flyway (simplest) or Liquibase (complex, multi-DB)
├── Python → Alembic (SQLAlchemy-native)
├── TypeScript/Node.js → Prisma Migrate (type-safe, shadow DB)
├── Go → goose (best tooling) or gormigrate (if using GORM)
└── Multi-language → Sqitch (tag-based, language-agnostic)

Need rollback support?
├── Yes → Liquibase (best rollback), Alembic (downgrade), or goose (down)
├── No → Flyway (forward-only, simpler)
```

### Homogeneous vs Heterogeneous Migration
| Type | Source → Target | Tooling | Complexity |
|---|---|---|---|
| Homogeneous | PostgreSQL → RDS PostgreSQL | pg_dump + pg_restore / DMS | Low |
| Homogeneous | MySQL → RDS MySQL | mysqldump / DMS | Low |
| Heterogeneous | Oracle → PostgreSQL | Ora2Pg, DMS, AWS SCT | High (type mapping) |
| Heterogeneous | SQL Server → PostgreSQL | Babelfish, DMS + SCT | High |
| Heterogeneous | Oracle → Aurora | AWS SCT + DMS | High |
| Heterogeneous | MongoDB → DocumentDB | DMS | Medium |
| Heterogeneous | Cassandra → DynamoDB | Custom ETL | Very High |
| Homogeneous | SQL Server → Azure SQL | Azure DMS | Low-Medium |

### Zero-Downtime Migration Strategies
| Strategy | Downtime | Complexity | Best For |
|---|---|---|---|
| Expand-Migrate-Contract | Zero | Medium | Adding columns, tables |
| Online schema change (gh-ost) | Near-zero | Medium | DDL on large MySQL |
| Blue/Green (replica promote) | Seconds | High | Full engine migration |
| Trigger-based sync | Seconds | High | Cross-engine replication |
| Expand-Contract with feature flags | Zero | Medium | Application-level changes |
| Parallel run (dual-write) | Zero | Very High | High-risk migrations |
| Shadow table | Minutes | Medium | Large table schema changes |

### Migration Strategy Decision
```
Can the application tolerate downtime?
├── Yes → Offline migration (simpler, faster, less risky)
│   ├── Data < 50GB → pg_dump/mysqldump
│   └── Data > 50GB → DMS full load
└── No → Online/zero-downtime migration
    ├── Same DB engine?
    │   ├── Yes → Replica promote (Blue/Green)
    │   └── No → CDC-based (DMS, Debezium)
    └── Schema-only change?
        ├── Yes → Expand-Migrate-Contract
        └── No → gh-ost (MySQL) or shadow table (PG)
```

## Quick Start
Assessment → Schema migration tool setup → Forward-only migration script → Test on staging → Backup → Execute migration → Verify → Handle rollback if needed.

## Core Workflow

### Step 1: Flyway Migration
```sql
-- sql/migrations/V1_001__create_users_table.sql
-- Flyway naming: V{version}__{description}.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
```

```sql
-- sql/migrations/V1_002__create_orders_table.sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    shipping_address JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
```

```yaml
# flyway.conf
flyway.url=jdbc:postgresql://localhost:5432/production
flyway.user=app_user
flyway.password=${DB_PASSWORD}
flyway.locations=filesystem:sql/migrations
flyway.baselineOnMigrate=true
flyway.baselineVersion=0
flyway.outOfOrder=false
flyway.validateOnMigrate=true
flyway.placeholderReplacement=true
flyway.placeholders.appName=myapp
```

### Step 2: Alembic Migration (Python)
```python
# alembic/versions/001_create_tables.py
"""create users and orders tables

Revision ID: 001
Revises: 
Create Date: 2025-06-01 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])

    op.create_table(
        'orders',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.BigInteger(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_orders_user_id', 'orders', ['user_id'])

def downgrade():
    op.drop_table('orders')
    op.drop_table('users')
```

```python
# alembic/versions/002_add_order_items.py
"""add order items

Revision ID: 002
Revises: 001
"""

revision = '002'
down_revision = '001'

def upgrade():
    op.create_table(
        'order_items',
        sa.Column('id', sa.BigInteger(), primary_key=True),
        sa.Column('order_id', sa.BigInteger(), sa.ForeignKey('orders.id', ondelete='CASCADE')),
        sa.Column('product_name', sa.String(255)),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
    )

def downgrade():
    op.drop_table('order_items')
```

### Step 3: Zero-Downtime Migration — Expand-Migrate-Contract
```sql
-- Phase 1: Expand (add new columns/tables, maintain old)
ALTER TABLE users ADD COLUMN display_name_new VARCHAR(100);
UPDATE users SET display_name_new = display_name WHERE display_name_new IS NULL;

-- Application updated to write to both display_name and display_name_new
-- Phase 2 ends when app is fully deployed

-- Phase 3: Contract (remove old columns)
ALTER TABLE users DROP COLUMN display_name;
ALTER TABLE users RENAME COLUMN display_name_new TO display_name;
```

### Step 4: Online Schema Migration with gh-ost
```bash
# gh-ost for MySQL — no triggers, no locking
gh-ost \
  --host=localhost \
  --user=app_user \
  --password=$DB_PASSWORD \
  --database=production \
  --table=orders \
  --alter="ADD COLUMN discount DECIMAL(5,2) DEFAULT 0, MODIFY COLUMN status VARCHAR(30)" \
  --execute \
  --cut-over=atomic \
  --chunk-size=500 \
  --max-lag-millis=1000 \
  --default-retries=60 \
  --approve-renamed-columns
```

### Step 5: AWS DMS for Online Migration
```yaml
# dms-task.yaml (CloudFormation)
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  DMSReplicationTask:
    Type: AWS::DMS::ReplicationTask
    Properties:
      ReplicationTaskIdentifier: "oracle-to-pg-online"
      SourceEndpointArn: !Ref SourceEndpoint
      TargetEndpointArn: !Ref TargetEndpoint
      ReplicationInstanceArn: !Ref ReplicationInstance
      MigrationType: full-load-and-cdc
      TableMappings: |
        {
          "rules": [{
            "rule-type": "selection",
            "rule-id": "1",
            "rule-name": "1",
            "object-locator": {
              "schema-name": "APP",
              "table-name": "%"
            },
            "rule-action": "include"
          }]
        }
      ReplicationTaskSettings: |
        {
          "FullLoadSettings": {
            "MaxFullLoadSubTasks": 8,
            "CreatePkAfterFullLoad": true,
            "TargetTablePrepMode": "DO_NOTHING"
          },
          "Logging": {
            "EnableLogging": true,
            "LogComponents": [{"Id": "TRANSFORMATION", "Severity": "LOGGER_SEVERITY_DEFAULT"}]
          }
        }
```

### Step 6: Migration CI/CD Pipeline
```yaml
# .github/workflows/migration.yml
name: Database Migrations
on:
  pull_request:
    paths: ['sql/migrations/**']
  push:
    branches: [main]
    paths: ['sql/migrations/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: testpass, POSTGRES_DB: test }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - run: |
          wget -q https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.0.0/flyway-commandline-10.0.0-linux-x64.tar.gz
          tar -xzf flyway-commandline-10.0.0-linux-x64.tar.gz

      - name: Validate migrations
        run: ./flyway-10.0.0/flyway -url=jdbc:postgresql://localhost:5432/test -user=postgres -password=testpass validate

      - name: Run migrations
        run: ./flyway-10.0.0/flyway -url=jdbc:postgresql://localhost:5432/test -user=postgres -password=testpass migrate

      - name: Verify schema
        run: |
          PGPASSWORD=testpass psql -h localhost -U postgres -d test -c "\dt"

  deploy:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Backup before migration
          pg_dump -h $PROD_HOST -U $PROD_USER -d production \
            --format=custom \
            --file=pre_migration_backup.dump
        env:
          PGPASSWORD: ${{ secrets.DB_PASSWORD }}
      - run: |
          # Run migration
          flyway -url=jdbc:postgresql://$PROD_HOST/production \
            -user=$PROD_USER -password=${{ secrets.DB_PASSWORD }} migrate
      - run: |
          # Verify post-migration
          pg_isready -h $PROD_HOST
```

### Step 7: Debezium for Change Data Capture
```yaml
# debezium-connector.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: debezium-postgres-connector
data:
  connector.json: |
    {
      "name": "inventory-connector",
      "config": {
        "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
        "database.hostname": "source-db.example.com",
        "database.port": "5432",
        "database.user": "replicator",
        "database.password": "${DB_PASSWORD}",
        "database.dbname": "production",
        "database.server.name": "production-db",
        "table.include.list": "public.orders,public.users",
        "plugin.name": "pgoutput",
        "publication.name": "debezium_pub",
        "slot.name": "debezium_slot",
        "snapshot.mode": "initial",
        "transforms": "unwrap",
        "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState"
      }
    }
```

### Step 8: Parallel Run (Dual-Write) Migration
```python
# parallel_run/migrator.py
"""Dual-write migration pattern with validation."""
from datetime import datetime

class DualWriteMigrator:
    """Write to both old and new database, compare results."""

    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
        self.mismatches = []

    def write_order(self, order_data):
        """Write order to both databases and validate."""
        # Write to old system first
        old_id = self.old_db.orders.insert(order_data)

        # Write to new system
        new_id = self.new_db.orders.insert(order_data)

        # Validate: read back and compare
        old_record = self.old_db.orders.find_by_id(old_id)
        new_record = self.new_db.orders.find_by_id(new_id)

        if not self._records_match(old_record, new_record):
            self.mismatches.append({
                "old_id": old_id,
                "new_id": new_id,
                "timestamp": datetime.utcnow(),
                "old_data": old_record,
                "new_data": new_record,
            })
            # Rollback new write — trust old until migration complete
            self.new_db.orders.delete(new_id)
            return old_id

        return new_id  # Return new ID going forward

    def _records_match(self, old, new):
        """Compare records field by field (excluding IDs and timestamps)."""
        ignore_keys = {"id", "created_at", "updated_at"}
        old_fields = {k: v for k, v in old.items() if k not in ignore_keys}
        new_fields = {k: v for k, v in new.items() if k not in ignore_keys}
        return old_fields == new_fields
```

### Step 9: Data Validation After Migration
```python
# validation/validate_migration.py
"""Validate data consistency after database migration."""
import hashlib

class MigrationValidator:
    def __init__(self, source_conn, target_conn):
        self.source = source_conn
        self.target = target_conn

    def validate_row_counts(self, tables):
        """Compare row counts for each table."""
        results = []
        for table in tables:
            src_count = self.source.execute(f"SELECT COUNT(*) FROM {table}").scalar()
            tgt_count = self.target.execute(f"SELECT COUNT(*) FROM {table}").scalar()
            match = src_count == tgt_count
            results.append({
                "table": table,
                "source_count": src_count,
                "target_count": tgt_count,
                "match": match,
            })
            if not match:
                print(f"ROW COUNT MISMATCH: {table}: src={src_count} tgt={tgt_count}")
        return results

    def validate_checksums(self, tables):
        """Compare MD5 checksums per table."""
        results = []
        for table in tables:
            src_hash = self.source.execute(
                f"SELECT MD5(CAST(COUNT(*) || SUM(HASHTEXT(CAST(row_to_json(t) AS TEXT))) AS TEXT)) FROM {table} AS t"
            ).scalar()
            tgt_hash = self.target.execute(
                f"SELECT MD5(CAST(COUNT(*) || SUM(HASHTEXT(CAST(row_to_json(t) AS TEXT))) AS TEXT)) FROM {table} AS t"
            ).scalar()
            match = src_hash == tgt_hash
            results.append({
                "table": table,
                "source_hash": src_hash,
                "target_hash": tgt_hash,
                "match": match,
            })
            if not match:
                print(f"CHECKSUM MISMATCH: {table}")
        return results

    def validate_foreign_keys(self):
        """Check all foreign key constraints are satisfied."""
        src_fk_violations = self.source.execute("""
            SELECT count(*) FROM (
                SELECT 1 FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE u.id IS NULL
            ) violations
        """).scalar()
        tgt_fk_violations = self.target.execute("""
            SELECT count(*) FROM (
                SELECT 1 FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE u.id IS NULL
            ) violations
        """).scalar()
        return {
            "source_fk_violations": src_fk_violations,
            "target_fk_violations": tgt_fk_violations,
            "match": src_fk_violations == tgt_fk_violations,
        }
```

## Security Considerations
- Database migration credentials must be stored in secrets manager (AWS Secrets Manager, Vault)
- Never check migration passwords into version control — use environment variables or CI secrets
- DMS replication instances must be in private subnets with security groups restricting source and target only
- Enable SSL/TLS for all migration connections (source, target, CDC replication)
- Azure DMS requires private endpoints for secure data transfer — avoid public endpoints
- After migration, revoke source database credentials and rotate app database credentials
- Audit migration actions in database logs for compliance (who ran what when)
- Snapshot both source and target before migration for forensic preservation
- For PII data, migration pipeline must comply with data residency requirements (no cross-border transfer)

## Anti-Patterns

### Anti-Pattern 1: No Rollback Plan
Applying migrations without a tested rollback. Every migration must have a corresponding down/downgrade script.

### Anti-Pattern 2: Large Single Migration
Migrating everything in one giant SQL file. Break into small, focused, reversible steps (one change per migration).

### Anti-Pattern 3: Schema and Data Changes Together
Mixing DDL and large data migrations in one transaction. DDL + data updates in one transaction can lock tables for hours.

### Anti-Pattern 4: Ignoring Locking
Running DDL that acquires ACCESS EXCLUSIVE lock during business hours. Use pg_repack, pt-online-schema-change, or gh-ost.

### Anti-Pattern 5: No Migration Testing
Applying migrations directly to production without validation. Test on staging with production-like data volume.

### Anti-Pattern 6: Editing Applied Migrations
Modifying a migration that already ran in production. Always create a new migration file — never modify historical ones.

### Anti-Pattern 7: Skipping Validation
Not running `flyway validate` or equivalent checks. Catch schema drift early before deployment.

### Anti-Pattern 8: No Monitoring During Migration
Applying migrations without watching database locks, replication lag, or error rates. Have a Grafana dashboard open during migration.

## Production Considerations

### Safety
- Always backup before migration.
- Test migration on staging with production-scale data.
- Run migrations during maintenance windows.
- Use transaction for reversible migrations.
- Monitor database locks during migration.

### Performance
- Use batch processing for large data migrations (batch size: 1000-10000).
- Add indexes after data load, not before.
- Consider using COPY for bulk data loading.
- Monitor replication lag during CDC migration.
- Set statement timeout to prevent runaway queries.

### Validation
- Run row count comparisons between source and target.
- Validate checksums for critical tables.
- Test application queries against migrated schema.
- Monitor error rates for 24 hours post-migration.
- Keep rollback plan ready for at least 72 hours.

## Rules & Constraints
- Every migration must be reversible (up + down).
- Test all migrations on staging before production.
- Backup database before any production migration.
- Never edit applied migrations — create new migration.
- One logical change per migration file.
- Use transactions for reversible schema changes.
- Set statement_timeout to prevent runaway migrations.
- Run validation checks (row counts, checksums) after every migration.
- Keep migration files in version control alongside application code.
- Document each migration with a clear comment explaining the reason.

## References
  - references/database-migration-advanced.md
  - references/database-migration-fundamentals.md
  - references/migration-strategies.md
  - references/migration-tools.md
  - references/online-migration.md
  - references/schema-migration-tools.md
  - references/schema-migration.md
  - references/zero-downtime.md
  - references/expand-contract-guide.md

## Handoff
Next: **cloud-migration** — full workload migration including databases.
