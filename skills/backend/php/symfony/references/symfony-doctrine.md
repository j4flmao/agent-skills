# Symfony Doctrine Guide

## Entity Definition
```php
// src/Entity/Order.php
#[Entity(repositoryClass: OrderRepository::class)]
#[Table(name: 'orders')]
class Order {
  #[Id]
  #[Column(type: 'uuid', unique: true)]
  #[GeneratedValue(strategy: 'CUSTOM')]
  #[CustomIdGenerator(class: 'doctrine.uuid_generator')]
  private string $id;

  #[Column(type: 'string', length: 100)]
  private string $customerId;

  #[Column(type: 'string', length: 20, enumType: OrderStatus::class)]
  private OrderStatus $status;

  #[Column(type: 'decimal', precision: 10, scale: 2)]
  private string $totalAmount;

  #[Column(type: 'datetime_immutable')]
  private DateTimeImmutable $createdAt;

  #[OneToMany(targetEntity: OrderItem::class, mappedBy: 'order', cascade: ['persist', 'remove'])]
  private Collection $items;

  public function __construct() {
    $this->createdAt = new DateTimeImmutable();
    $this->items = new ArrayCollection();
  }
}
```

## Repository
```php
// src/Repository/OrderRepository.php
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class OrderRepository extends ServiceEntityRepository {
  public function __construct(ManagerRegistry $registry) {
    parent::__construct($registry, Order::class);
  }

  public function findRecent(int $limit = 20): array {
    return $this->createQueryBuilder('o')
      ->orderBy('o.createdAt', 'DESC')
      ->setMaxResults($limit)
      ->getQuery()
      ->getResult();
  }

  public function findByCustomer(string $customerId): array {
    return $this->findBy(['customerId' => $customerId], ['createdAt' => 'DESC']);
  }

  public function getPendingTotal(): float {
    return (float) $this->createQueryBuilder('o')
      ->select('SUM(o.totalAmount)')
      ->where('o.status = :status')
      ->setParameter('status', 'pending')
      ->getQuery()
      ->getSingleScalarResult();
  }
}
```

## Migrations
```bash
# Generate migration from entity changes
php bin/console make:migration

# Run migrations
php bin/console doctrine:migrations:migrate

# Rollback
php bin/console doctrine:migrations:migrate prev

# Generate empty migration
php bin/console make:migration --no-interaction
```

## Migration File
```php
// migrations/Version20240101000000.php
final class Version20240101000000 extends AbstractMigration {
  public function up(Schema $schema): void {
    $this->addSql('CREATE TABLE orders (
      id UUID NOT NULL, customer_id VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL, total_amount NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
      PRIMARY KEY(id)
    )');
    $this->addSql('COMMENT ON COLUMN orders.id IS \'(DC2Type:uuid)\'');
  }

  public function down(Schema $schema): void {
    $this->addSql('DROP TABLE orders');
  }
}
```

## Fixtures
```php
// src/DataFixtures/AppFixtures.php
use Doctrine\Bundle\FixturesBundle\Fixture;

class AppFixtures extends Fixture {
  public function load(ObjectManager $manager): void {
    for ($i = 0; $i < 10; $i++) {
      $order = new Order();
      $order->setCustomerId("cust-$i");
      $order->setStatus(OrderStatus::PENDING);
      $order->setTotalAmount(100.00 + $i * 10);
      $manager->persist($order);
    }
    $manager->flush();
  }
}
```

## Query Builder Methods

| Method | Purpose |
|---|---|
| `select()` | SELECT clause |
| `from()` | FROM clause |
| `where()` / `andWhere()` / `orWhere()` | WHERE conditions |
| `setParameter()` | Parameterized queries |
| `orderBy()` / `addOrderBy()` | Sorting |
| `groupBy()` / `having()` | Aggregation |
| `join()` / `leftJoin()` | Relationships |
| `setMaxResults()` / `setFirstResult()` | Pagination |

## Lifecycle Callbacks
```php
#[Entity]
#[HasLifecycleCallbacks]
class Order {
  #[PrePersist]
  public function onPrePersist(): void {
    $this->createdAt = new DateTimeImmutable();
  }

  #[PreUpdate]
  public function onPreUpdate(): void {
    $this->updatedAt = new DateTimeImmutable();
  }
}
```
