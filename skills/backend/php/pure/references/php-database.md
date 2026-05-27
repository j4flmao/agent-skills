# Pure PHP Database Patterns

## PDO Connection Management

### Connection Factory
```php
<?php

declare(strict_types=1);

namespace App\Database;

class ConnectionFactory
{
    private static array $connections = [];

    public static function create(string $name = 'default'): PDO
    {
        if (isset(self::$connections[$name])) {
            return self::$connections[$name];
        }

        $config = self::getConfig($name);

        $dsn = sprintf(
            '%s:host=%s;port=%d;dbname=%s;charset=%s',
            $config['driver'],
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset'] ?? 'utf8mb4',
        );

        $pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ]);

        self::$connections[$name] = $pdo;
        return $pdo;
    }

    private static function getConfig(string $name): array
    {
        $configs = [
            'default' => [
                'driver' => $_ENV['DB_DRIVER'] ?? 'mysql',
                'host' => $_ENV['DB_HOST'] ?? '127.0.0.1',
                'port' => (int) ($_ENV['DB_PORT'] ?? 3306),
                'database' => $_ENV['DB_DATABASE'] ?? 'app',
                'username' => $_ENV['DB_USERNAME'] ?? 'root',
                'password' => $_ENV['DB_PASSWORD'] ?? '',
                'charset' => 'utf8mb4',
            ],
            'read_replica' => [
                'driver' => $_ENV['DB_DRIVER'] ?? 'mysql',
                'host' => $_ENV['DB_REPLICA_HOST'] ?? '127.0.0.1',
                'port' => (int) ($_ENV['DB_PORT'] ?? 3306),
                'database' => $_ENV['DB_DATABASE'] ?? 'app',
                'username' => $_ENV['DB_USERNAME'] ?? 'root',
                'password' => $_ENV['DB_PASSWORD'] ?? '',
                'charset' => 'utf8mb4',
            ],
        ];

        return $configs[$name] ?? throw new \RuntimeException("Database config '{$name}' not found");
    }

    public static function close(string $name = 'default'): void
    {
        self::$connections[$name] = null;
        unset(self::$connections[$name]);
    }
}
```

## Repository Pattern

### Base Repository
```php
<?php

declare(strict_types=1);

namespace App\Repository;

use App\Database\ConnectionFactory;
use PDO;

abstract class BaseRepository
{
    protected PDO $pdo;

    public function __construct(?string $connection = 'default')
    {
        $this->pdo = ConnectionFactory::create($connection);
    }

    protected function fetchAll(string $query, array $params = []): array
    {
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    protected function fetchOne(string $query, array $params = []): ?array
    {
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    protected function execute(string $query, array $params = []): int
    {
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    protected function insert(string $table, array $data): string
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_map(fn($col) => ":{$col}", array_keys($data)));

        $query = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($data);

        return $this->pdo->lastInsertId();
    }

    protected function update(string $table, array $data, array $where): int
    {
        $set = implode(', ', array_map(fn($col) => "{$col} = :{$col}", array_keys($data)));
        $conditions = implode(' AND ', array_map(fn($col) => "{$col} = :where_{$col}", array_keys($where)));

        $params = $data;
        foreach ($where as $key => $value) {
            $params["where_{$key}"] = $value;
        }

        $query = "UPDATE {$table} SET {$set} WHERE {$conditions}";
        return $this->execute($query, $params);
    }
}
```

### User Repository
```php
<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;

class UserRepository extends BaseRepository
{
    public function findById(int $id): ?User
    {
        $row = $this->fetchOne(
            'SELECT * FROM users WHERE id = :id AND deleted_at IS NULL',
            ['id' => $id],
        );

        return $row ? User::fromArray($row) : null;
    }

    public function findByEmail(string $email): ?User
    {
        $row = $this->fetchOne(
            'SELECT * FROM users WHERE email = :email AND deleted_at IS NULL',
            ['email' => $email],
        );

        return $row ? User::fromArray($row) : null;
    }

    public function findAll(int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        $rows = $this->fetchAll(
            'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT :limit OFFSET :offset',
            ['limit' => $perPage, 'offset' => $offset],
        );

        return array_map(fn($row) => User::fromArray($row), $rows);
    }

    public function save(User $user): User
    {
        $data = $user->toArray();

        if ($user->id) {
            $data['updated_at'] = date('Y-m-d H:i:s');
            $this->update('users', $data, ['id' => $user->id]);
        } else {
            $data['created_at'] = date('Y-m-d H:i:s');
            $data['updated_at'] = $data['created_at'];
            $id = $this->insert('users', $data);
            $user->setId((int) $id);
        }

        return $user;
    }

    public function delete(int $id): bool
    {
        return (bool) $this->execute(
            'UPDATE users SET deleted_at = NOW() WHERE id = :id',
            ['id' => $id],
        );
    }
}
```

## Entity Pattern

### User Entity
```php
<?php

declare(strict_types=1);

namespace App\Entity;

class User
{
    public function __construct(
        private ?int $id,
        private string $email,
        private string $password,
        private string $name,
        private string $role = 'user',
        private string $status = 'active',
        private ?string $createdAt = null,
        private ?string $updatedAt = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: (int) $data['id'],
            email: $data['email'],
            password: $data['password'],
            name: $data['name'],
            role: $data['role'] ?? 'user',
            status: $data['status'] ?? 'active',
            createdAt: $data['created_at'] ?? null,
            updatedAt: $data['updated_at'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'email' => $this->email,
            'password' => $this->password,
            'name' => $this->name,
            'role' => $this->role,
            'status' => $this->status,
        ];
    }

    public function setId(int $id): void
    {
        $this->id = $id;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name,
            'role' => $this->role,
            'status' => $this->status,
            'created_at' => $this->createdAt,
        ];
    }
}
```

## Migration System

### Migration Runner
```php
<?php

declare(strict_types=1);

namespace App\Database;

use PDO;

class MigrationRunner
{
    private PDO $pdo;
    private string $migrationsPath;

    public function __construct(string $migrationsPath)
    {
        $this->pdo = ConnectionFactory::create();
        $this->migrationsPath = $migrationsPath;
        $this->ensureMigrationsTable();
    }

    private function ensureMigrationsTable(): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_migration (migration)
            )
        ");
    }

    public function migrate(): void
    {
        $executed = $this->getExecutedMigrations();
        $files = $this->getMigrationFiles();

        foreach ($files as $file) {
            if (in_array($file, $executed)) {
                continue;
            }

            $sql = file_get_contents($this->migrationsPath . '/' . $file);
            $this->pdo->beginTransaction();

            try {
                $this->pdo->exec($sql);
                $this->pdo->prepare(
                    'INSERT INTO migrations (migration) VALUES (:migration)'
                )->execute(['migration' => $file]);

                $this->pdo->commit();
                echo "Migrated: {$file}\n";
            } catch (\Exception $e) {
                $this->pdo->rollBack();
                throw new \RuntimeException("Migration failed: {$file}: " . $e->getMessage());
            }
        }
    }

    public function rollback(int $steps = 1): void
    {
        $executed = $this->getExecutedMigrations();

        if (empty($executed)) {
            echo "No migrations to rollback.\n";
            return;
        }

        $toRollback = array_slice($executed, -$steps);

        foreach (array_reverse($toRollback) as $migration) {
            $downFile = str_replace('.up.sql', '.down.sql', $migration);

            if (!file_exists($this->migrationsPath . '/' . $downFile)) {
                echo "No down migration for: {$migration}, skipping.\n";
                continue;
            }

            $sql = file_get_contents($this->migrationsPath . '/' . $downFile);

            $this->pdo->beginTransaction();
            try {
                $this->pdo->exec($sql);
                $this->pdo->prepare(
                    'DELETE FROM migrations WHERE migration = :migration'
                )->execute(['migration' => $migration]);

                $this->pdo->commit();
                echo "Rolled back: {$migration}\n";
            } catch (\Exception $e) {
                $this->pdo->rollBack();
                throw new \RuntimeException("Rollback failed: {$migration}: " . $e->getMessage());
            }
        }
    }

    private function getExecutedMigrations(): array
    {
        $rows = $this->pdo->query(
            'SELECT migration FROM migrations ORDER BY id ASC'
        )->fetchAll(PDO::FETCH_COLUMN);

        return $rows;
    }

    private function getMigrationFiles(): array
    {
        $files = glob($this->migrationsPath . '/*.up.sql');
        sort($files);

        return array_map(fn($path) => basename($path), $files);
    }
}
```

## Query Building

### Query Builder
```php
<?php

declare(strict_types=1);

namespace App\Database;

class QueryBuilder
{
    private string $table;
    private array $selects = ['*'];
    private array $wheres = [];
    private array $params = [];
    private array $orderBy = [];
    private ?int $limit = null;
    private ?int $offset = null;
    private array $joins = [];

    public function __construct(private PDO $pdo) {}

    public function table(string $table): self
    {
        $this->table = $table;
        return $this;
    }

    public function select(array $columns): self
    {
        $this->selects = $columns;
        return $this;
    }

    public function where(string $column, string $operator, mixed $value): self
    {
        $param = ":where_{$column}_" . count($this->wheres);
        $this->wheres[] = "{$column} {$operator} {$param}";
        $this->params[$param] = $value;
        return $this;
    }

    public function whereIn(string $column, array $values): self
    {
        $placeholders = [];
        foreach ($values as $i => $value) {
            $param = ":where_{$column}_in_{$i}";
            $placeholders[] = $param;
            $this->params[$param] = $value;
        }
        $this->wheres[] = "{$column} IN (" . implode(', ', $placeholders) . ")";
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $this->orderBy[] = "{$column} {$direction}";
        return $this;
    }

    public function limit(int $limit, ?int $offset = null): self
    {
        $this->limit = $limit;
        $this->offset = $offset;
        return $this;
    }

    public function get(): array
    {
        $sql = $this->buildSelect();
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($this->params);
        return $stmt->fetchAll();
    }

    public function first(): ?array
    {
        $this->limit(1);
        $result = $this->get();
        return $result[0] ?? null;
    }

    private function buildSelect(): string
    {
        $sql = "SELECT " . implode(', ', $this->selects);
        $sql .= " FROM {$this->table}";

        foreach ($this->joins as $join) {
            $sql .= " {$join['type']} JOIN {$join['table']} ON {$join['on']}";
        }

        if (!empty($this->wheres)) {
            $sql .= " WHERE " . implode(' AND ', $this->wheres);
        }

        if (!empty($this->orderBy)) {
            $sql .= " ORDER BY " . implode(', ', $this->orderBy);
        }

        if ($this->limit !== null) {
            $sql .= " LIMIT {$this->limit}";
        }

        if ($this->offset !== null) {
            $sql .= " OFFSET {$this->offset}";
        }

        return $sql;
    }
}
```

## Key Points
- PDO with prepared statements prevents SQL injection
- Connection factory manages read/write replicas
- Base repository provides common CRUD abstraction
- Entities map database rows to typed objects
- Migration runner tracks and applies schema changes
- Query builder constructs dynamic SQL safely
- Repositories separate data access from business logic
- Transactions ensure atomic multi-table operations
- Named parameters improve query readability and maintainability
- Entities expose toResponse() to control API output
