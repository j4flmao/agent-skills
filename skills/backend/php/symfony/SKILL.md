---
name: symfony-backend
description: >
  Use this skill when building Symfony backend applications — bundles, Doctrine ORM, Twig templates, Flex recipes, Messenger component. This skill enforces: service container autowiring, proper bundle structure, Doctrine mapping conventions, Flex-driven configuration. Do NOT use for: Laravel projects, WordPress plugins, pure PHP micro-frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, php, phase-4]
---

# Symfony Backend

## Purpose
Define Symfony backend application architecture: service container, Doctrine ORM, Twig templating, Messenger queue processing, and Flex recipe management.

## Agent Protocol

### Trigger
User request includes: `symfony`, `symfony backend`, `symfony bundle`, `doctrine symfony`, `twig template`, `symfony flex`, `symfony messenger`, `php symfony`, `symfony service`.

### Input Context
- PHP version (8.1+)
- Symfony version (6.4+, 7.x)
- Database (Doctrine ORM, Doctrine MongoDB)
- Template engine (Twig)
- Queue (Messenger with Redis, Doctrine, AMQP)
- API format (REST, GraphQL with API Platform)

### Output Artifact
A markdown document containing:
- Project structure
- Service container autowiring conventions
- Doctrine entity and repository setup
- Controller conventions
- Twig template organization
- Messenger message/handler setup
- Event subscriber pattern
- Testing (PHPUnit, WebTestCase, Panther)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Services autowired via constructor injection
- Doctrine entities with proper mappings
- Messenger configured with transport and handlers
- Tests use Symfony WebTestCase
- Flex recipes drive package configuration

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
# Create project with Symfony CLI
symfony new order-service --webapp

# Add packages via Flex
composer require doctrine/orm
composer require doctrine/doctrine-migrations-bundle
composer require symfony/messenger
composer require symfony/serializer-pack
composer require symfony/validator
composer require symfony/rate-limiter

# Dev dependencies
composer require --dev symfony/test-pack
composer require --dev doctrine/doctrine-fixtures-bundle
composer require --dev symfony/maker-bundle
composer require --dev symfony/profiler-pack
```

### Step 2: Project Structure
```
src/
+-- Controller/
|   +-- OrderController.php
|   +-- AuthController.php
|   +-- HealthController.php
+-- Entity/
|   +-- Order.php
|   +-- OrderItem.php
|   +-- User.php
+-- Repository/
|   +-- OrderRepository.php
|   +-- UserRepository.php
+-- Service/
|   +-- OrderService.php
|   +-- PaymentService.php
|   +-- NotificationService.php
+-- Message/
|   +-- OrderCreatedMessage.php
|   +-- SendConfirmationMessage.php
|   +-- Handler/
|       +-- OrderCreatedHandler.php
|       +-- SendConfirmationHandler.php
+-- Event/
|   +-- OrderSubscriber.php
|   +-- AuditSubscriber.php
+-- DTO/
|   +-- CreateOrderRequest.php
|   +-- OrderResponse.php
|   +-- OrderItemDto.php
+-- DataFixtures/
|   +-- AppFixtures.php
|   +-- OrderFixtures.php
+-- Security/
|   +-- Voter/
|   |   +-- OrderVoter.php
|   +-- Authenticator/
|       +-- JwtAuthenticator.php
+-- Kernel.php
config/
+-- packages/
|   +-- doctrine.yaml
|   +-- messenger.yaml
|   +-- security.yaml
|   +-- rate_limiter.yaml
+-- routes/
|   +-- api.yaml
+-- services.yaml
+-- preload.php
templates/
+-- base.html.twig
+-- order/
|   +-- list.html.twig
|   +-- detail.html.twig
+-- email/
    +-- confirmation.html.twig
migrations/
tests/
+-- Controller/
|   +-- OrderControllerTest.php
+-- Service/
|   +-- OrderServiceTest.php
+-- Entity/
    +-- OrderTest.php
```

### Step 3: Doctrine Entity with Attributes
```php
// src/Entity/Order.php
#[Entity(repositoryClass: OrderRepository::class)]
#[Table(name: 'orders')]
#[HasLifecycleCallbacks]
class Order {
    #[Id, Column(type: 'uuid', unique: true)]
    #[GeneratedValue(strategy: 'NONE')]
    private string $id;

    #[Column(type: 'string', length: 100)]
    private string $customerId;

    #[Column(type: 'string', length: 20, enumType: OrderStatus::class)]
    private OrderStatus $status;

    #[Column(type: 'decimal', precision: 10, scale: 2)]
    private string $totalAmount;

    #[OneToMany(mappedBy: 'order', targetEntity: OrderItem::class, cascade: ['persist', 'remove'], fetch: 'EAGER')]
    private Collection $items;

    #[Column(type: 'datetime_immutable')]
    private DateTimeImmutable $createdAt;

    #[Column(type: 'datetime_immutable', nullable: true)]
    private ?DateTimeImmutable $updatedAt = null;

    public function __construct() {
        $this->id = Uuid::v4()->toString();
        $this->status = OrderStatus::PENDING;
        $this->items = new ArrayCollection();
        $this->createdAt = new DateTimeImmutable();
    }

    #[PreUpdate]
    public function onPreUpdate(): void {
        $this->updatedAt = new DateTimeImmutable();
    }

    public function addItem(OrderItem $item): void {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setOrder($this);
            $this->recalculateTotal();
        }
    }

    private function recalculateTotal(): void {
        $total = 0;
        foreach ($this->items as $item) {
            $total += $item->getQuantity() * (float) $item->getUnitPrice();
        }
        $this->totalAmount = (string) $total;
    }

    // Getters and setters...
}

// src/Entity/OrderItem.php
#[Entity]
#[Table(name: 'order_items')]
class OrderItem {
    #[Id, Column(type: 'uuid', unique: true)]
    #[GeneratedValue(strategy: 'NONE')]
    private string $id;

    #[ManyToOne(targetEntity: Order::class, inversedBy: 'items')]
    #[JoinColumn(name: 'order_id', referencedColumnName: 'id', nullable: false)]
    private Order $order;

    #[Column(type: 'string', length: 100)]
    private string $productId;

    #[Column(type: 'integer')]
    private int $quantity;

    #[Column(type: 'decimal', precision: 10, scale: 2)]
    private string $unitPrice;

    public function __construct() {
        $this->id = Uuid::v4()->toString();
    }

    // Getters and setters...
}

// src/Entity/OrderStatus.php
enum OrderStatus: string {
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case SHIPPED = 'shipped';
    case DELIVERED = 'delivered';
    case CANCELLED = 'cancelled';

    public function canCancel(): bool {
        return in_array($this, [self::PENDING, self::CONFIRMED]);
    }
}
```

### Step 4: Repository
```php
// src/Repository/OrderRepository.php
#[AsRepository]
class OrderRepository extends ServiceEntityRepository {
    public function __construct(ManagerRegistry $registry) {
        parent::__construct($registry, Order::class);
    }

    public function findByCustomerIdPaginated(string $customerId, int $page, int $limit): array {
        return $this->createQueryBuilder('o')
            ->andWhere('o.customerId = :customerId')
            ->setParameter('customerId', $customerId)
            ->orderBy('o.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function countByStatus(OrderStatus $status): int {
        return $this->createQueryBuilder('o')
            ->select('COUNT(o.id)')
            ->andWhere('o.status = :status')
            ->setParameter('status', $status->value)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function findRecentOrders(int $limit = 10): array {
        return $this->createQueryBuilder('o')
            ->orderBy('o.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}
```

### Step 5: Controller
```php
// src/Controller/OrderController.php
#[Route('/api/orders')]
class OrderController extends AbstractController {
    public function __construct(
        private readonly OrderService $orderService,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
    ) {}

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse {
        $dto = $this->serializer->deserialize(
            $request->getContent(),
            CreateOrderRequest::class,
            'json'
        );

        $errors = $this->validator->validate($dto);
        if (count($errors) > 0) {
            return $this->json(['errors' => (string) $errors], Response::HTTP_BAD_REQUEST);
        }

        $order = $this->orderService->create($dto);
        return $this->json(
            OrderResponse::fromEntity($order),
            Response::HTTP_CREATED
        );
    }

    #[Route('/{id}', methods: ['GET'])]
    public function get(string $id): JsonResponse {
        $order = $this->orderService->findById($id);
        if (!$order) {
            throw $this->createNotFoundException('Order not found');
        }
        return $this->json(OrderResponse::fromEntity($order));
    }

    #[Route('', methods: ['GET'])]
    public function list(Request $request): JsonResponse {
        $page = $request->query->getInt('page', 1);
        $limit = $request->query->getInt('limit', 20);
        $orders = $this->orderService->findAllPaginated($page, $limit);
        return $this->json($orders);
    }

    #[Route('/{id}/cancel', methods: ['POST'])]
    public function cancel(string $id): JsonResponse {
        $this->orderService->cancel($id);
        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
```

### Step 6: Service Layer
```php
// src/Service/OrderService.php
class OrderService {
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly OrderRepository $orderRepository,
        private readonly EventDispatcherInterface $eventDispatcher,
        private readonly MessageBusInterface $messageBus,
    ) {}

    public function create(CreateOrderRequest $dto): Order {
        $order = new Order();
        $order->setCustomerId($dto->customerId);

        foreach ($dto->items as $itemDto) {
            $item = new OrderItem();
            $item->setProductId($itemDto->productId);
            $item->setQuantity($itemDto->quantity);
            $item->setUnitPrice((string) $itemDto->unitPrice);
            $order->addItem($item);
        }

        $this->entityManager->persist($order);
        $this->entityManager->flush();

        $this->messageBus->dispatch(new OrderCreatedMessage($order->getId()));

        return $order;
    }

    public function findById(string $id): ?Order {
        return $this->orderRepository->find($id);
    }

    public function findAllPaginated(int $page, int $limit): array {
        return $this->orderRepository->findBy([], ['createdAt' => 'DESC'], $limit, ($page - 1) * $limit);
    }

    public function cancel(string $id): void {
        $order = $this->orderRepository->find($id);
        if (!$order) {
            throw $this->createNotFoundException('Order not found');
        }
        if (!$order->getStatus()->canCancel()) {
            throw new \RuntimeException('Order cannot be cancelled in current status');
        }
        $order->setStatus(OrderStatus::CANCELLED);
        $this->entityManager->flush();

        $this->eventDispatcher->dispatch(new OrderCancelledEvent($order));
    }
}
```

### Step 7: Messenger Configuration
```yaml
# config/packages/messenger.yaml
framework:
  messenger:
    transports:
      async: '%env(MESSENGER_TRANSPORT_DSN)%'
      failed: 'doctrine://default?queue_name=failed'

    routing:
      'App\Message\OrderCreatedMessage': async
      'App\Message\SendConfirmationMessage': async

    failure_transport: failed

    retry_strategy:
      max_retries: 3
      delay: 1000
      multiplier: 2
      max_delay: 10000
```

```php
// src/Message/OrderCreatedMessage.php
class OrderCreatedMessage {
    public function __construct(
        public readonly string $orderId,
        public readonly string $customerId,
        public readonly float $totalAmount,
    ) {}
}

// src/Message/Handler/OrderCreatedHandler.php
class OrderCreatedHandler {
    public function __construct(
        private readonly NotificationService $notifier,
        private readonly InventoryService $inventoryService,
        private readonly LoggerInterface $logger,
    ) {}

    public function __invoke(OrderCreatedMessage $message): void {
        $this->logger->info('Processing order: ' . $message->orderId);

        try {
            $this->inventoryService->reserveItems($message->orderId);
            $this->notifier->sendConfirmation($message->orderId, $message->customerId);
        } catch (\Exception $e) {
            $this->logger->error('Failed to process order', [
                'orderId' => $message->orderId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
```

### Step 8: Event Subscriber
```php
// src/Event/OrderSubscriber.php
class OrderSubscriber implements EventSubscriberInterface {
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly MessageBusInterface $messageBus,
    ) {}

    public static function getSubscribedEvents(): array {
        return [
            OrderCreatedEvent::class => 'onOrderCreated',
            OrderCancelledEvent::class => 'onOrderCancelled',
        ];
    }

    public function onOrderCreated(OrderCreatedEvent $event): void {
        $order = $event->getOrder();
        $this->auditLogger->log('order.created', [
            'orderId' => $order->getId(),
            'customerId' => $order->getCustomerId(),
            'totalAmount' => $order->getTotalAmount(),
        ]);
    }

    public function onOrderCancelled(OrderCancelledEvent $event): void {
        $order = $event->getOrder();
        $this->auditLogger->log('order.cancelled', [
            'orderId' => $order->getId(),
            'status' => $order->getStatus()->value,
        ]);
    }
}
```

### Step 9: Testing
```php
// tests/Controller/OrderControllerTest.php
class OrderControllerTest extends WebTestCase {
    private KernelBrowser $client;

    protected function setUp(): void {
        $this->client = static::createClient();
    }

    public function testCreateOrder(): void {
        $this->client->request('POST', '/api/orders', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'customerId' => 'cust-1',
            'items' => [
                ['productId' => 'prod-1', 'quantity' => 2, 'unitPrice' => 19.99],
            ],
        ]));

        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('id', $data);
        $this->assertEquals('cust-1', $data['customerId']);
    }

    public function testGetNonExistentOrder(): void {
        $this->client->request('GET', '/api/orders/non-existent');
        $this->assertResponseStatusCodeSame(404);
    }
}
```

## Architecture Decision Trees

### Entity Mapping
```
Need database-first or existing schema reverse engineering?
  +-- Yes -> Use Doctrine attributes matching existing columns
  +-- No  -> Code-first. Define entities with #[Entity] attributes, generate migrations
```

### Messenger Transport
```
Need message persistence and guaranteed delivery?
  +-- Yes -> Doctrine transport (messages stored in DB, transactional)
  +-- No  -> Need high throughput?
      +-- Yes -> Redis transport (fast, in-memory)
      +-- No  -> AMQP transport (RabbitMQ, feature-rich)
```

## Common Pitfalls

1. **Autowiring fails for ambiguous services**: Multiple implementations of same interface. Use `#[AsTaggedItem]` or bind in services.yaml.

2. **Doctrine lazy loading outside request scope**: Accessing lazy collections after entity manager close. Eager load or keep EM open.

3. **Messenger serialization with complex objects**: Messages must be serializable. Use simple DTOs with scalar properties only.

4. **Missing migrations for entity changes**: Adding fields without migration breaks schema. Use `doctrine:migrations:diff` and `doctrine:migrations:migrate`.

5. **.env file committed to repository**: Contains secrets. Use .env.local for local overrides, .env for defaults only.

6. **Controller as service not configured**: Prior to Symfony 6, services need explicit wiring. Use #[AsController] attribute.

7. **Forgetting flush() after persist**: Entity changes not written to DB until flush(). Wrap in transaction for consistency.

8. **Security voter not registered**: Custom voters need #[AsVoter] or tagging in services.yaml.

9. **Twig template not found**: Templates in wrong location. Follow `templates/{controller}/{action}.html.twig` convention.

10. **Cache not cleared after config changes**: Use `cache:clear` and `cache:warmup` after modifying services.yaml.

## Best Practices

1. **Autowiring enabled for all services** — manual wiring only for third-party bundles.
2. **Doctrine entities with typed properties and attributes** (not annotations).
3. **Messenger for async tasks** (emails, notifications, processing).
4. **EventSubscriber for cross-cutting concerns** (audit, logging).
5. **Flex recipes manage all package configuration** — avoid manual config.
6. **PHPUnit with WebTestCase for functional tests**.
7. **DTO layer between request and entity** — never persist raw request data.
8. **Validation groups for different contexts** (create vs update validation rules).
9. **EntityManager::clear() for batch processing** to avoid memory leaks.
10. **Doctrine migrations with `doctrine-migrations-bundle`** for all schema changes.

## Compared With

| Feature | Symfony | Laravel | Laminas (Zend) |
|---|---|---|---|
| DI Container | Autowiring, compiler passes | Service provider | Service manager |
| ORM | Doctrine ORM | Eloquent | Doctrine (optional) |
| Template engine | Twig | Blade | PHP templates |
| Queue | Messenger | Queues | No built-in |
| API Platform | API Platform | Laravel Sanctum | API problem |
| Bundle ecosystem | 1000+ | 5000+ | 100+ |
| Learning curve | Steep | Moderate | Steep |
| Debug toolbar | Profiler | Debugbar | No built-in |
| Migration tool | DoctrineMigrations | Built-in | DoctrineMigrations |
| Event system | EventDispatcher | Events | EventManager |

## Performance

- Symfony 7 with PHP 8.3 handles ~2,000 req/s (single worker, full framework).
- Doctrine: Use query cache (`apcu`), result cache, metadata cache in production.
- Twig template cache: Enabled by default in production (`twig/cache` directory).
- Messenger: Doctrine transport for reliability, Redis for throughput. Consumer count: 2-4 per queue.
- Profiler disabled in production: Remove `symfony/profiler-pack` or set `framework.profiler.only_exceptions`.
- PHP OPcache enabled for 2x performance improvement.
- Preloading with `config/preload.php` to compile hot classes at startup.

## Tooling

| Tool | Purpose |
|---|---|
| **Symfony CLI** | Project creation, local server, certificate management |
| **Maker Bundle** | Code generation (controllers, entities, commands) |
| **Doctrine Migrations** | Schema versioning |
| **PHPUnit** | Testing framework |
| **Twig** | Template engine |
| **Messenger** | Async message queue |
| **Serializer** | Object serialization/deserialization |
| **Validator** | Input validation |
| **Rate Limiter** | API rate limiting |
| **Security Bundle** | Auth, ACL, voters |
| **Monolog** | Logging |
| **Docker** | Containerization |
| **PHP-CS-Fixer** | Code style |

## Rules

- Autowiring enabled for all services — manual wiring only for third-party bundles.
- Doctrine entities with typed properties and attributes (not annotations).
- Messenger for async tasks (emails, notifications, processing).
- EventSubscriber for cross-cutting concerns (audit, logging).
- Flex recipes manage all package configuration — avoid manual config.
- PHPUnit with WebTestCase for functional tests.
- #[AsController], #[AsRepository], #[AsCommand] attributes for automatic service registration.
- DTOs for request/response — never expose entities in API responses.
- #[Groups] on entity properties for serialization context (API Platform/Serializer).
- Migration generated for every entity change — never manual DDL in production.
- Security voters for complex authorization rules.
- Rate limiter applied to all API endpoints in production.

## References
  - references/symfony-doctrine-orm.md — Symfony Doctrine ORM Reference
  - references/symfony-messenger-queue.md — Symfony Messenger Queue Reference
  - references/symfony-architecture.md — Symfony Architecture
  - references/symfony-deployment.md — Symfony Deployment
  - references/symfony-doctrine.md — Symfony Doctrine Guide
  - references/symfony-security.md — Symfony Security Reference
  - references/symfony-setup.md — Symfony Setup Guide
  - references/symfony-testing.md — Symfony Testing Reference

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
