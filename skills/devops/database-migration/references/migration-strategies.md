# Database Migration Strategies

## Sequential Migration

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-v1
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migration
          image: migration-tool:v1
          env:
            - name: DB_HOST
              value: postgres-primary
            - name: DB_NAME
              value: myapp
            - name: MIGRATION_DIR
              value: /migrations/v1
          command:
            - migrate
            - -path
            - /migrations
            - -database
            - postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):5432/$(DB_NAME)?sslmode=require
            - up
```

## Blue-Green Database Migration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-config
data:
  replicas: "3"
  batch_size: "1000"
  cutover_timeout: "300"

---
apiVersion: batch/v1
kind: Job
metadata:
  name: backfill-new-schema
spec:
  template:
    spec:
      containers:
        - name: backfill
          image: migration-tool:v2
          command:
            - backfill
            - --source-db
            - postgres://old-db:5432/myapp
            - --target-db
            - postgres://new-db:5432/myapp
            - --batch-size=1000
            - --workers=4
            - --verify
---
apiVersion: batch/v1
kind: Job
metadata:
  name: verify-data-integrity
spec:
  template:
    spec:
      containers:
        - name: verify
          image: migration-tool:v2
          command:
            - verify
            - --source-db=old-db
            - --target-db=new-db
            - --tables=users,orders,products
            - --sample-rate=0.1
```

## Online Schema Migration

```python
import time
import psycopg2
from typing import List, Tuple

class OnlineMigration:
    """Execute schema changes without downtime."""

    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)
        self.conn.autocommit = True

    def add_column_with_default(self, table: str, column: str, col_type: str, default: str):
        """Add column with default value in stages."""
        # Stage 1: Add nullable column
        self._execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

        # Stage 2: Backfill in batches
        self._backfill_column(table, column, default)

        # Stage 3: Set NOT NULL
        self._execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET NOT NULL")

    def _backfill_column(self, table: str, column: str, default_value: str, batch_size: int = 1000):
        """Backfill new column in batches."""
        offset = 0
        while True:
            query = f"""
                UPDATE {table}
                SET {column} = {default_value}
                WHERE ctid IN (
                    SELECT ctid FROM {table}
                    WHERE {column} IS NULL
                    ORDER BY ctid
                    LIMIT {batch_size}
                )
            """
            affected = self._execute(query)
            if affected == 0:
                break
            offset += affected
            time.sleep(0.1)
```

## Key Points

- Use sequential migrations for simple schema changes
- Use blue-green for complex schema transformations
- Implement online migrations for zero downtime
- Always backfill new columns before adding constraints
- Use batch processing for large tables
- Verify data integrity after migration
- Implement rollback procedures for each migration
- Test migrations on staging environment first
- Monitor replication lag during migrations
- Use feature flags to gate new schema usage
- Maintain backward compatibility during transition
- Document each migration with rollback plan
