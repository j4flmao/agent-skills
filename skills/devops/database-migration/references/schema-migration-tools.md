# Schema Migration Tools

## Liquibase Migration

```xml
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                   http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.0.xsd">
    <changeSet id="1" author="dev">
        <createTable tableName="users">
            <column name="id" type="uuid">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="email" type="varchar(255)">
                <constraints unique="true" nullable="false"/>
            </column>
            <column name="created_at" type="timestamp">
                <constraints nullable="false"/>
            </column>
        </createTable>
    </changeSet>

    <changeSet id="2" author="dev">
        <addColumn tableName="users">
            <column name="profile_picture" type="text"/>
        </addColumn>
        <sql>
            UPDATE users SET profile_picture = 'default.png'
            WHERE profile_picture IS NULL
        </sql>
        <addNotNullConstraint tableName="users"
                             columnName="profile_picture"
                             columnDataType="text"/>
    </changeSet>
</databaseChangeLog>
```

## Flyway Migration

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- V2__add_profile_fields.sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- V3__create_sessions_table.sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

## Schema Version Control

```python
import os
import re
from typing import List

class MigrationManager:
    """Manage and apply database migrations."""

    def __init__(self, migrations_dir: str, connection_string: str):
        self.migrations_dir = migrations_dir
        self.connection_string = connection_string

    def get_pending_migrations(self) -> List[str]:
        """Get list of migrations not yet applied."""
        applied = self._get_applied_migrations()
        available = self._get_available_migrations()
        return [m for m in available if m not in applied]

    def _get_available_migrations(self) -> List[str]:
        """List migration files sorted by version."""
        files = []
        for f in os.listdir(self.migrations_dir):
            match = re.match(r'V(\d+)__(.+)\.sql', f)
            if match:
                version = int(match.group(1))
                files.append((version, f))
        return [f for _, f in sorted(files)]

    def apply_migration(self, migration_file: str):
        """Apply a single migration file."""
        filepath = os.path.join(self.migrations_dir, migration_file)
        with open(filepath, 'r') as f:
            sql = f.read()
        # Execute migration within transaction
        self._execute(sql)
        # Record migration
        self._record_migration(migration_file)
```

## Key Points

- Use Liquibase for XML-based migration management
- Use Flyway for SQL-based versioned migrations
- Always include rollback scripts for each migration
- Use repeatable migrations for views and functions
- Implement migration checksums for integrity
- Validate migrations in CI pipeline
- Use schema version table to track state
- Keep migrations idempotent where possible
- Use transaction wrapping for atomic migrations
- Handle conflicts in distributed migrations
- Test migrations on restored production data
- Monitor migration execution time and errors
