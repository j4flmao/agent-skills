# Symfony Architecture

## Service Container

```yaml
# config/services.yaml
services:
  _defaults:
    autowire: true
    autoconfigure: true
    bind:
      $projectDir: '%kernel.project_dir%'

  App\:
    resource: '../src/'
    exclude:
      - '../src/DependencyInjection/'
      - '../src/Entity/'
      - '../src/Kernel.php'

  # Manual wiring (rare)
  App\Service\PaymentService:
    arguments:
      $apiKey: '%env(PAYMENT_API_KEY)%'
```

## Bundle System

```
src/
  Controller/
  Entity/
  Repository/
  Service/
  EventSubscriber/
  Form/
  DTO/
  DataFixtures/
  Security/
  Twig/
  Command/
  Migrations/
  Kernel.php
```

Core bundles used:
- **FrameworkBundle** — Core framework
- **DoctrineBundle** — ORM
- **TwigBundle** — Templating
- **SecurityBundle** — Auth
- **MonologBundle** — Logging
- **MessengerBundle** — Message queue

## Event Dispatcher

```php
// src/EventSubscriber/OrderSubscriber.php
namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class OrderSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            OrderCreatedEvent::class => ['onOrderCreated', 10],
            OrderCancelledEvent::class => 'onOrderCancelled',
        ];
    }

    public function onOrderCreated(OrderCreatedEvent $event): void
    {
        $this->logger->info('Order created: ' . $event->getOrderId());
        $this->mailer->sendOrderConfirmation($event->getOrderId());
    }
}
```

## Dependency Injection Patterns

```php
// Autowiring — default
class OrderService
{
    public function __construct(
        private readonly OrderRepository $repo,
        private readonly LoggerInterface $logger,
    ) {}
}

// Tagged services
class NotificationService
{
    /** @param NotificationChannelInterface[] $channels */
    public function __construct(
        #[TaggedIterator('app.notification.channel')]
        private readonly iterable $channels,
    ) {}
}

// Configurator
class OrderServiceConfigurator
{
    public function configure(OrderService $service): void
    {
        $service->setRetryLimit(3);
    }
}
```

## Controller Patterns

```php
// AbstractController-based
class OrderController extends AbstractController
{
    public function __construct(
        private readonly OrderService $service,
        private readonly SerializerInterface $serializer,
    ) {}

    #[Route('/api/orders', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $dto = $this->serializer->deserialize(
            $request->getContent(),
            CreateOrderRequest::class,
            'json',
        );
        $order = $this->service->create($dto);
        return $this->json($order, Response::HTTP_CREATED, [], [
            'groups' => ['order:read'],
        ]);
    }
}

// Invokable controller (for simple endpoints)
class HealthController
{
    public function __invoke(): JsonResponse
    {
        return new JsonResponse(['status' => 'ok']);
    }
}
```

## Configuration Management

```yaml
# config/packages/framework.yaml
framework:
    secret: '%env(APP_SECRET)%'
    session:
        handler_id: null
        cookie_secure: auto
        cookie_samesite: lax

# config/services/order.yaml
services:
    _defaults: { autowire: true }
    App\Service\OrderService:
        calls:
            - setTaxRate: '%env(TAX_RATE)%'
```

## Console Commands

```php
#[AsCommand(name: 'app:process-expired')]
class ProcessExpiredOrdersCommand extends Command
{
    public function __construct(private readonly OrderService $service)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $count = $this->service->cancelExpired();
        $output->writeln("Cancelled {$count} expired orders");
        return Command::SUCCESS;
    }
}
```

## Security Architecture

```yaml
security:
    providers: { database: { entity: { class: App\Entity\User } } }
    firewalls:
        api:
            pattern: ^/api
            stateless: true
            jwt: ~
        main:
            lazy: true
            provider: database
            form_login:
                login_path: login
                check_path: login
            logout:
                path: logout
```
