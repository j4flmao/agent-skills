# Laminas DB & Doctrine

## laminas-db TableGateway

### Configuration
```php
// config/autoload/global.php
return [
    'db' => [
        'driver' => 'Pdo_Mysql',
        'hostname' => $_ENV['DB_HOST'],
        'port' => $_ENV['DB_PORT'],
        'database' => $_ENV['DB_NAME'],
        'username' => $_ENV['DB_USER'],
        'password' => $_ENV['DB_PASS'],
        'charset' => 'utf8mb4',
        'driver_options' => [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ],
    ],
];
```

### TableGateway Factory
```php
'factories' => [
    \Laminas\Db\Adapter\AdapterInterface::class => \Laminas\Db\Adapter\AdapterServiceFactory::class,
    Model\UserTable::class => Model\UserTableFactory::class,
],
```

### Advanced Queries
```php
use Laminas\Db\Sql\Select;
use Laminas\Db\Sql\Where;

class UserRepository
{
    public function findActiveUsers(int $limit = 20): array
    {
        $select = $this->tableGateway->getSql()->select();
        $select->where(['status' => 'active'])
               ->order('created_at DESC')
               ->limit($limit);

        return $this->tableGateway->selectWith($select)->toArray();
    }

    public function searchUsers(string $query): array
    {
        $select = $this->tableGateway->getSql()->select();
        $select->where(function (Where $where) use ($query) {
            $where->like('name', "%{$query}%");
            $where->or;
            $where->like('email', "%{$query}%");
        });

        return $this->tableGateway->selectWith($select)->toArray();
    }

    public function getWithOrders(int $userId): ?array
    {
        $sql = $this->tableGateway->getSql();
        $select = $sql->select();
        $select->join('orders', 'users.id = orders.user_id', ['order_id' => 'id', 'total'])
               ->where(['users.id' => $userId]);

        return $sql->prepareStatementForSqlObject($select)->execute()->getResource()->fetchAll();
    }
}
```

## Doctrine ORM

### Installation
```bash
composer require doctrine/orm
composer require laminas/laminas-doctrine
```

### Configuration
```php
// module.config.php
'doctrine' => [
    'connection' => [
        'orm_default' => [
            'driverClass' => \Doctrine\DBAL\Driver\PDO\MySQL\Driver::class,
            'params' => [
                'host' => $_ENV['DB_HOST'],
                'port' => $_ENV['DB_PORT'],
                'dbname' => $_ENV['DB_NAME'],
                'user' => $_ENV['DB_USER'],
                'password' => $_ENV['DB_PASS'],
                'charset' => 'utf8mb4',
                'driverOptions' => [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION],
            ],
        ],
    ],
    'driver' => [
        'my_entities' => [
            'class' => \Doctrine\ORM\Mapping\Driver\AttributeDriver::class,
            'paths' => [__DIR__ . '/../src/Entity'],
        ],
        'orm_default' => [
            'drivers' => ['User\Entity' => 'my_entities'],
        ],
    ],
    'migrations' => [
        'directory' => __DIR__ . '/../migrations',
        'namespace' => 'User\Migrations',
        'table' => 'doctrine_migrations',
    ],
];
```

### Entity
```php
<?php
namespace User\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
#[ORM\Table(name: 'users')]
class User
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\Column(type: 'string', length: 255, unique: true)]
    private string $email;

    #[ORM\Column(type: 'string', length: 255)]
    private string $password;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\OneToMany(targetEntity: Order::class, mappedBy: 'user')]
    private Collection $orders;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->orders = new ArrayCollection();
    }

    // Getters and setters...
}
```

### Repository
```php
<?php
namespace User\Repository;

use Doctrine\ORM\EntityRepository;

class UserRepository extends EntityRepository
{
    public function findActiveUsers(): array
    {
        $qb = $this->createQueryBuilder('u');
        return $qb->where('u.status = :status')
                  ->setParameter('status', 'active')
                  ->orderBy('u.createdAt', 'DESC')
                  ->getQuery()
                  ->getResult();
    }

    public function countByMonth(): array
    {
        $qb = $this->createQueryBuilder('u');
        return $qb->select('MONTH(u.createdAt) as month, COUNT(u.id) as count')
                  ->groupBy('month')
                  ->orderBy('month', 'ASC')
                  ->getQuery()
                  ->getScalarResult();
    }
}
```

### CLI Commands
```bash
vendor/bin/doctrine orm:schema-tool:create       # Create schema
vendor/bin/doctrine orm:schema-tool:update --force # Update schema
vendor/bin/doctrine migrations:diff               # Generate migration
vendor/bin/doctrine migrations:migrate             # Run migration
vendor/bin/doctrine dbal:import data.sql          # Import SQL
```

## Migration (Doctrine Migrations)

```php
<?php
declare(strict_types=1);

namespace User\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260522000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create users table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE users (
            id INT AUTO_INCREMENT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE users');
    }
}
```
