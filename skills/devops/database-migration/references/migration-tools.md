# Migration Tools

## Flyway

### Setup
```bash
# Directory structure
migrations/
  V1__create_users.sql
  V2__add_orders_table.sql
  V3__add_email_index.sql
  R__user_view.sql                # Repeatable (views, functions)
  U1__drop_users.sql              # Undo (Pro only)
```

### Configuration (flyway.conf)
```properties
flyway.url=jdbc:postgresql://prod-db:5432/myapp
flyway.user=myapp
flyway.password=${FLYWAY_PASSWORD}
flyway.locations=filesystem:migrations
flyway.baselineOnMigrate=true
flyway.baselineVersion=1
flyway.placeholderReplacement=true
flyway.placeholders.env=prod
flyway.outOfOrder=false
flyway.validateMigrationNaming=true
```

### Commands
```bash
flyway info                    # Current state
flyway migrate                 # Apply pending migrations
flyway validate                # Check checksums match
flyway baseline -baselineVersion=0   # For existing databases
flyway repair                  # Fix checksum issues
flyway undo                    # Undo last migration (Pro)
flyway migrate -dryRunOutput=dryrun.sql   # Dry run
```

### Migration Files
```sql
-- V1__create_users.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- V2__add_orders_table.sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- V3__add_email_index.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- U1__drop_users.sql (undo)
DROP TABLE IF EXISTS users;
```

## Liquibase

### Setup
```xml
<changeLogFile>db/changelog/db.changelog-master.xml</changeLogFile>
<url>jdbc:postgresql://prod-db:5432/myapp</url>
<username>myapp</username>
<password>${LIQUIBASE_PASSWORD}</password>
```

### Changesets
```xml
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

  <changeSet id="1" author="j4flmao">
    <createTable tableName="users">
      <column name="id" type="bigint" autoIncrement="true">
        <constraints primaryKey="true"/>
      </column>
      <column name="email" type="varchar(255)">
        <constraints nullable="false" unique="true"/>
      </column>
      <column name="name" type="varchar(100)"/>
      <column name="created_at" type="timestamp" defaultValueComputed="now()"/>
    </createTable>
    <rollback>
      <dropTable tableName="users"/>
    </rollback>
  </changeSet>
</databaseChangeLog>
```

### Commands
```bash
liquibase generateChangeLog          # From existing DB
liquibase update                     # Apply pending changesets
liquibase rollbackCount 1            # Rollback last changeset
liquibase rollback v1                # Rollback to tag
liquibase updateSQL > dryrun.sql     # Dry run
liquibase status --verbose           # Show pending changes
liquibase diff                       # Compare schemas
```

## Alembic
```bash
alembic init alembic
alembic revision --autogenerate -m "add orders table"
alembic upgrade head
alembic downgrade -1
alembic history                     # View migration history
alembic current                     # Current revision
alembic heads                       # Show branch heads
```

### Configuration (alembic.ini)
```ini
sqlalchemy.url = postgresql://myapp:password@prod-db:5432/myapp
```

### Migration File
```python
"""add orders table"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('total', sa.Numeric(10,2), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

def downgrade():
    op.drop_table('orders')
```

## Tool Comparison
| Feature | Flyway | Liquibase | Alembic |
|---------|--------|-----------|---------|
| Language | SQL-first | XML/YAML/JSON/SQL | Python |
| Auto-generate | No | Yes (diff) | Yes (autogenerate) |
| Rollback | Pro only | Built-in | Built-in |
| Repeatable | R__ migrations | runAlways | Branch detection |
| CI friendly | Yes | Yes | Yes |
| Best for | Java/any | Enterprise/Java | Python projects |

## Key Points
- Flyway for SQL-first simplicity, Liquibase for enterprise rollback, Alembic for Python ecosystems
- Migration files are immutable after creation — checksum validation prevents tampering
- Repeatable migrations for views/functions that change frequently
- Always test migrations against production-sized data before applying
- Dry run validates SQL syntax and plans before execution
- Baseline existing databases before adding migration tooling
