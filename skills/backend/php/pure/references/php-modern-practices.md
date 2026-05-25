# PHP Modern Practices

## PHP 8.x Features

### Named Arguments

```php
function createOrder(
    string $customerId,
    array $items,
    string $status = 'pending',
    ?string $notes = null,
): Order {}

// Named arguments — order doesn't matter
createOrder(
    customerId: 'cust-123',
    items: [['sku' => 'A', 'qty' => 1]],
    notes: 'Rush delivery',
);
```

### Attributes

```php
#[Attribute(Attribute::TARGET_PROPERTY)]
class NotBlank
{
    public function __construct(public readonly string $message = 'Field is required') {}
}

class CreateOrderRequest
{
    #[NotBlank('Customer ID is required')]
    public string $customerId;

    #[NotBlank]
    #[ArrayMinSize(1)]
    public array $items;
}
```

### Constructor Property Promotion

```php
// PHP 7.x
class OrderService
{
    private OrderRepository $repo;
    private LoggerInterface $logger;

    public function __construct(OrderRepository $repo, LoggerInterface $logger)
    {
        $this->repo = $repo;
        $this->logger = $logger;
    }
}

// PHP 8.x
class OrderService
{
    public function __construct(
        private readonly OrderRepository $repo,
        private readonly LoggerInterface $logger,
    ) {}
}
```

### Match Expression

```php
// Switch
switch ($status) {
    case 'pending':
        $label = 'Pending';
        break;
    case 'confirmed':
        $label = 'Confirmed';
        break;
    default:
        $label = 'Unknown';
}

// Match (PHP 8+)
$label = match ($status) {
    'pending' => 'Pending',
    'confirmed' => 'Confirmed',
    'shipped' => 'Shipped',
    default => 'Unknown',
};
```

### Enums

```php
enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Confirmed => 'Confirmed',
            self::Shipped => 'Shipped',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
        };
    }

    public function canCancel(): bool
    {
        return in_array($this, [self::Pending, self::Confirmed], true);
    }
}
```

### Readonly Properties

```php
class Order
{
    public function __construct(
        public readonly string $id,
        public readonly string $customerId,
        public readonly OrderStatus $status,
        private(set) array $items = [],
    ) {}

    public function addItem(OrderItem $item): void
    {
        $this->items[] = $item;
    }
}
```

## PSR Standards

| Standard | Description | Implementation |
|----------|-------------|----------------|
| PSR-4 | Autoloading | Composer autoload |
| PSR-7 | HTTP messages | laminas-diactoros, nyholm/psr7 |
| PSR-11 | Container interface | php-di, laminas-servicemanager |
| PSR-14 | Event dispatcher | Symfony EventDispatcher |
| PSR-15 | HTTP handlers/middleware | slim, laminas-stratigility |
| PSR-18 | HTTP client | guzzlehttp/psr18 |

## Type System

```php
declare(strict_types=1);

// Union types
function findById(int|string $id): Order|null {}

// Mixed type
function process(mixed $input): string {}

// Never return type
function abort(string $message): never
{
    throw new \RuntimeException($message);
}

// Nullsafe operator
$country = $order?->getAddress()?->getCountry() ?? 'Unknown';

// Array unpacking
$config = [...$defaultConfig, ...$userConfig];
```

## Error Handling

```php
// Throwable catches everything
try {
    processOrder($data);
} catch (ValidationException $e) {
    // Handle validation errors
} catch (NotFoundException $e) {
    // Handle not found
} catch (\Throwable $e) {
    // Handle everything else
    error_log($e->getMessage());
    throw $e;
} finally {
    // Always executes
    cleanupResources();
}
```

## Fiber-based Concurrency (PHP 8.1+)

```php
$fiber = new Fiber(function (): void {
    $result = Fiber::suspend('fetching...');
    // Process result
});

$value = $fiber->start();
echo $value; // 'fetching...'
$fiber->resume('data');
```
