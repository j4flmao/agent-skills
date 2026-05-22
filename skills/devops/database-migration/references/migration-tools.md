# Migration Tools

## Flyway

### Setup

```bash
# Download Flyway CLI
# https://redgate.com/products/flyway/

# Directory structure
migrations/
├── V1__create_users.sql
├── V2__add_orders_table.sql
├── V3__add_email_index.sql
├── R__user_view.sql                # Repeatable migration
└── undo/
    └── U1__drop_users.sql          # Undo migration (Pro)
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
# Info (current state)
flyway info

# Migrate
flyway migrate

# Validate (check checksums match)
flyway validate

# Baseline (for existing databases)
flyway baseline -baselineVersion=0

# Repair (fix checksum issues)
flyway repair

# Undo (Pro only)
flyway undo

# Dry run
flyway migrate -dryRunOutput=dryrun.sql
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

-- V2__add_orders_table.sql (backward-compatible)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- V3__add_email_index.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- U1__drop_users.sql (undo)
DROP TABLE IF EXISTS users;
```

## Liquibase

### Setup

```xml
<!-- liquibase.properties -->
changeLogFile: db/changelog/db.changelog-master.xml
url: jdbc:postgresql://prod-db:5432/myapp
username: myapp
password: ${LIQUIBASE_PASSWORD}
```

### Changesets

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
  xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
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
# Generate changelog from existing DB
liquibase generateChangeLog

# Apply pending changesets
liquibase update

# Rollback last changeset
liquibase rollbackCount 1

# Rollback to tag
liquibase rollback v1

# Dry run
liquibase updateSQL > dryrun.sql
```

## Alembic

```bash
# Init
alembic init alembic

# Create migration
alembic revision --autogenerate -m "add orders table"

# Apply
alembic upgrade head

# Rollback
alembic downgrade -1
```
