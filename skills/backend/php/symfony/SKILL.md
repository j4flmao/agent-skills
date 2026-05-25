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

# Dev dependencies
composer require --dev symfony/test-pack
composer require --dev doctrine/doctrine-fixtures-bundle
```

### Step 2: Project Structure
```
src/
├── Controller/
│   ├── OrderController.php
│   └── HealthController.php
├── Entity/
│   └── Order.php
├── Repository/
│   └── OrderRepository.php
├── Service/
│   └── OrderService.php
├── Message/
│   ├── OrderCreatedMessage.php
│   └── Handler/
│       └── OrderCreatedHandler.php
├── Event/
│   └── OrderSubscriber.php
├── DTO/
│   ├── CreateOrderRequest.php
│   └── OrderResponse.php
├── DataFixtures/
│   └── AppFixtures.php
└── Kernel.php
config/
├── packages/
│   ├── doctrine.yaml
│   └── messenger.yaml
├── routes/
│   └── api.yaml
└── services.yaml
templates/
└── order/
    ├── list.html.twig
    └── detail.html.twig
```

### Step 3: Doctrine Entity
```php
// src/Entity/Order.php
#[Entity(repositoryClass: OrderRepository::class)]
#[Table(name: 'orders')]
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

  #[Column(type: 'datetime_immutable')]
  private DateTimeImmutable $createdAt;

  public function __construct() {
    $this->id = Uuid::v4()->toString();
    $this->createdAt = new DateTimeImmutable();
  }
}
```

### Step 4: Controller
```php
// src/Controller/OrderController.php
#[Route('/api/orders')]
class OrderController extends AbstractController {
  public function __construct(
    private readonly OrderService $orderService,
    private readonly SerializerInterface $serializer,
  ) {}

  #[Route('', methods: ['POST'])]
  public function create(Request $request): JsonResponse {
    $dto = $this->serializer->deserialize(
      $request->getContent(),
      CreateOrderRequest::class,
      'json'
    );
    $order = $this->orderService->create($dto);
    return $this->json($order, Response::HTTP_CREATED);
  }

  #[Route('/{id}', methods: ['GET'])]
  public function get(string $id): JsonResponse {
    $order = $this->orderService->findById($id);
    if (!$order) throw $this->createNotFoundException('Order not found');
    return $this->json($order);
  }
}
```

### Step 5: Messenger Configuration
```yaml
# config/packages/messenger.yaml
framework:
  messenger:
    transports:
      async: '%env(MESSENGER_TRANSPORT_DSN)%'

    routing:
      'App\Message\OrderCreatedMessage': async
```

```php
// src/Message/OrderCreatedMessage.php
class OrderCreatedMessage {
  public function __construct(public readonly string $orderId) {}
}

// src/Message/Handler/OrderCreatedHandler.php
class OrderCreatedHandler {
  public function __construct(
    private readonly NotificationService $notifier,
    private readonly LoggerInterface $logger,
  ) {}

  public function __invoke(OrderCreatedMessage $message): void {
    $this->logger->info('Processing order: ' . $message->orderId);
    $this->notifier->sendConfirmation($message->orderId);
  }
}
```

## Rules
- Autowiring enabled for all services — manual wiring only for third-party bundles.
- Doctrine entities with typed properties and attributes (not annotations).
- Messenger for async tasks (emails, notifications, processing).
- EventSubscriber for cross-cutting concerns (audit, logging).
- Flex recipes manage all package configuration — avoid manual config.
- PHPUnit with WebTestCase for functional tests.

## References

### Reference Files
- `references/symfony-setup.md` — Symfony setup, Flex, bundles, routing
- `references/symfony-doctrine.md` — Doctrine ORM entities, repositories, migrations
- `references/symfony-architecture.md` — Service container, bundles, events, DI, controllers
- `references/symfony-deployment.md` — Docker, CI/CD, platforms, caching, queue workers

### Related Skills
- `backend/universal/api-response/SKILL.md` — API response envelope
- `backend/universal/oop-principles/SKILL.md` — SOLID for PHP

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
