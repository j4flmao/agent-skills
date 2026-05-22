# Laravel Testing

## Pest Test Structure

```
tests/
├── Feature/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── OrderControllerTest.php
│   │   │   └── AuthControllerTest.php
│   │   └── Middleware/
│   │       └── AdminMiddlewareTest.php
│   ├── Console/
│   │   └── SyncUsersCommandTest.php
│   └── Mail/
│       └── OrderConfirmationTest.php
├── Unit/
│   ├── Services/
│   │   └── OrderServiceTest.php
│   └── Models/
│       ├── OrderTest.php
│       └── UserTest.php
├── TestCase.php
└── Pest.php
```

## Pest Setup

```php
// tests/Pest.php
uses(Tests\TestCase::class)->in('Feature');
uses(Tests\TestCase::class)->in('Unit');
```

## Feature Tests

### HTTP Tests
```php
<?php
use App\Models\Order;
use App\Models\User;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\deleteJson;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('lists orders', function () {
    Order::factory()->count(3)->for($this->user)->create();

    getJson('/api/orders')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('creates an order', function () {
    $product = Product::factory()->create(['price' => 1000]);

    $response = postJson('/api/orders', [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2, 'price' => 1000],
        ],
        'shipping_address' => [
            'street' => '123 Main St',
            'city' => 'Hanoi',
            'postal_code' => '10000',
        ],
    ]);

    $response->assertCreated()
        ->assertJsonStructure(['id', 'total', 'status']);
});

it('requires authentication', function () {
    $this->postJson('/api/orders')->assertUnauthorized();
});

it('validates required fields', function () {
    actingAs($this->user)
        ->postJson('/api/orders', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['items']);
});

it('shows an order', function () {
    $order = Order::factory()->for($this->user)->hasItems(3)->create();

    getJson("/api/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $order->id);
});

it('deletes an order', function () {
    $order = Order::factory()->for($this->user)->create();

    deleteJson("/api/orders/{$order->id}")->assertNoContent();
    $this->assertDatabaseMissing('orders', ['id' => $order->id]);
});
```

### Authentication Tests
```php
it('registers a user', function () {
    postJson('/api/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertCreated()
      ->assertJsonStructure(['token', 'user']);
});

it('logs in', function () {
    $user = User::factory()->create(['password' => bcrypt('password')]);

    postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()
      ->assertJsonStructure(['token']);
});

it('fails login with wrong password', function () {
    $user = User::factory()->create();

    postJson('/api/login', [
        'email' => $user->email,
        'password' => 'wrong',
    ])->assertUnauthorized();
});
```

### Authorization Tests
```php
it('prevents unauthorized order access', function () {
    $order = Order::factory()->create(); // different user

    actingAs($this->user)
        ->getJson("/api/orders/{$order->id}")
        ->assertForbidden();
});

it('allows admin access', function () {
    $admin = User::factory()->admin()->create();

    actingAs($admin)
        ->getJson('/api/admin/dashboard')
        ->assertOk();
});
```

## Unit Tests

### Service Tests
```php
<?php
use App\Models\Order;
use App\Services\OrderService;
use App\Repositories\OrderRepository;

beforeEach(function () {
    $this->repo = Mockery::mock(OrderRepository::class);
    $this->service = new OrderService($this->repo);
});

it('calculates order total', function () {
    $items = [
        ['price' => 1000, 'quantity' => 2],
        ['price' => 500, 'quantity' => 1],
    ];

    $total = $this->service->calculateTotal($items);

    expect($total)->toBe(2500);
});

it('creates order with items', function () {
    $order = Order::factory()->make(['id' => 1]);

    $this->repo->shouldReceive('create')
        ->once()
        ->andReturn($order);

    $result = $this->service->create(['user_id' => 1, 'items' => []]);

    expect($result->id)->toBe(1);
});
```

### Model Tests
```php
it('has pending scope', function () {
    Order::factory()->create(['status' => 'pending']);
    Order::factory()->create(['status' => 'shipped']);

    $pending = Order::pending()->get();

    expect($pending)->toHaveCount(1)
        ->and($pending->first()->status)->toBe('pending');
});

it('calculates total from items', function () {
    $order = Order::factory()
        ->has(OrderItem::factory()->count(3)->sequence(
            ['price' => 1000, 'quantity' => 2],
            ['price' => 500, 'quantity' => 1],
            ['price' => 200, 'quantity' => 5],
        ), 'items')
        ->create();

    expect($order->items_total)->toBe(3500);
});
```

## Console Command Tests
```php
it('syncs users', function () {
    $this->artisan('sync:users')
        ->expectsQuestion('Sync users from CRM?', 'yes')
        ->expectsOutput('Starting sync...')
        ->expectsOutput('Sync completed.')
        ->assertExitCode(0);
});

it('syncs users with force flag', function () {
    $this->artisan('sync:users --force')
        ->doesntExpectOutput('Starting sync...')
        ->assertExitCode(0);
});
```

## Mail / Notification Tests
```php
it('sends order confirmation', function () {
    Mail::fake();
    $order = Order::factory()->create();

    $this->service->process($order);

    Mail::assertSent(OrderConfirmation::class, fn($mail) => $mail->order->id === $order->id);
});

it('sends notification', function () {
    Notification::fake();
    $user = User::factory()->create();

    $user->notify(new OrderShipped(Order::factory()->create()));

    Notification::assertSentTo($user, OrderShipped::class);
});
```

## Database Assertions
```php
$this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'shipped']);
$this->assertDatabaseMissing('orders', ['id' => 999]);
$this->assertDatabaseCount('orders', 5);
$this->assertModelExists($order);
$this->assertModelMissing($order);
```

## Mocking

```php
// Partial mock
$service = Mockery::mock(OrderService::class)->makePartial();
$service->shouldReceive('sendNotification')->once();

// Spy
$service = Bus::fake();
// ... run code
Bus::assertDispatched(ProcessPayment::class, fn($job) => $job->order->id === $order->id);

// HTTP fake
Http::fake([
    'https://payment.example.com/*' => Http::response(['status' => 'ok'], 200),
]);
```

## Pest Helpers

```php
// Custom expectation
expect()->extend('toBeMoney', function (int $cents) {
    return $this->toBe(number_format($cents / 100, 2));
});

// Higher order testing
$collection = collect([1, 2, 3]);
expect($collection)->each->toBeInt();

// Exception testing
test('validation fails for invalid email', function () {
    $this->expectException(ValidationException::class);
    // ...
});
```
