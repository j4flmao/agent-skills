---
name: php-laravel
description: >
  Use this skill when the user says 'Laravel', 'Artisan', 'Eloquent',
  'Blade', 'Laravel routing', 'Laravel middleware', 'Laravel validation',
  'Laravel service provider', 'Laravel facade', 'Laravel queue',
  'Laravel event', 'Laravel notification', 'Laravel testing',
  'Pest PHP', 'Laravel Sail', 'Laravel Breeze', 'Laravel Jetstream',
  'Laravel Sanctum', 'Laravel Passport', 'Laravel Horizon',
  'Laravel Nova', 'Laravel Filament', 'Laravel Livewire',
  'Laravel Octane', 'Laravel Reverb', 'Laravel Folio', 'Laravel Volt'.
  Covers: Laravel project structure, artisan commands, Eloquent ORM,
  Blade templating, routing, middleware, validation, service providers,
  facades, queues, events, notifications, testing with Pest, API
  development, authentication (Sanctum/Passport), deployment.
  Do NOT use this for: plain PHP (use php-pure), Zend/Laminas (use
  php-zend), or Symfony-specific questions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, php, laravel, phase-7]
---

# Laravel

## Purpose
Build Laravel applications following framework conventions: Eloquent ORM, Artisan CLI, Blade templating, service container, queues, events, testing. Every Laravel project must follow the framework's opinionated structure.

## Agent Protocol

### Trigger
Exact user phrases: "Laravel", "Artisan", "Eloquent", "Blade", "Laravel routing", "Laravel middleware", "Laravel validation", "Laravel service provider", "Laravel queue", "Laravel event", "Laravel notification", "Laravel test", "Pest PHP", "Laravel Sail", "Laravel Sanctum", "Laravel Passport", "Laravel Horizon", "Laravel Octane", "Laravel Reverb", "Laravel Folio", "Laravel Volt", "Filament", "Laravel Nova".

### Input Context
- Laravel version (11+ recommended, 12 current).
- PHP version (8.2+ required for Laravel 11).
- Database (MySQL, PostgreSQL, SQLite, MariaDB).
- Desired features (API, auth, admin panel, queues, websockets).
- Starter kit (Breeze, Jetstream, none).
- Deployment target (Forge, Vapor, Docker, shared hosting).

### Output Artifact
Artisan commands, PHP files, Blade templates, configuration files. No extraneous explanation.

### Response Format
PHP code / Artisan commands / config files. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Project initialized with correct Laravel version.
- [ ] Database models with Eloquent relationships, factories, seeders.
- [ ] Routes defined (web + API) with middleware groups.
- [ ] Form requests with validation rules.
- [ ] Service layer for business logic (not in controllers).
- [ ] Queue job for async processing.
- [ ] Event + listener for side effects.
- [ ] Tests (Feature + Unit) with Pest or PHPUnit.
- [ ] API auth (Sanctum for SPA, Passport for OAuth).

### Max Response Length
Direct file output. No response text.

## Project Structure

```
project/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   └── UserController.php
│   │   │   └── Web/
│   │   │       └── DashboardController.php
│   │   ├── Middleware/
│   │   │   ├── EnsureEmailIsVerified.php
│   │   │   └── RedirectIfNotAdmin.php
│   │   └── Requests/
│   │       ├── StoreUserRequest.php
│   │       └── UpdateUserRequest.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Order.php
│   │   └── Product.php
│   ├── Services/
│   │   ├── UserService.php
│   │   └── PaymentService.php
│   ├── Jobs/
│   │   └── ProcessPayment.php
│   ├── Events/
│   │   └── OrderShipped.php
│   ├── Listeners/
│   │   └── SendShipmentNotification.php
│   ├── Notifications/
│   │   └── OrderConfirmation.php
│   ├── Providers/
│   │   ├── AppServiceProvider.php
│   │   └── RouteServiceProvider.php
│   ├── Exceptions/
│   │   └── Handler.php
│   └── Console/
│       └── Commands/
│           └── SyncUsers.php
├── config/
│   ├── app.php
│   ├── database.php
│   └── services.php
├── database/
│   ├── migrations/
│   │   └── 2026_01_01_000001_create_orders_table.php
│   ├── factories/
│   │   └── OrderFactory.php
│   └── seeders/
│       └── OrderSeeder.php
├── resources/
│   └── views/
│       ├── layouts/
│       │   └── app.blade.php
│       └── livewire/
│           └── order-table.blade.php
├── routes/
│   ├── web.php
│   ├── api.php
│   └── console.php
├── tests/
│   ├── Feature/
│   │   └── OrderTest.php
│   └── Unit/
│       └── UserTest.php
└── composer.json
```

## Quick Start

```bash
composer create-project laravel/laravel my-app
cd my-app

# Development server
php artisan serve

# Create model with migration, factory, seeder, controller
php artisan make:model Order -a

# Create form request
php artisan make:request StoreOrderRequest
```

## Eloquent ORM

### Model
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = ['user_id', 'total', 'status', 'shipped_at'];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'shipped_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
```

### Controller
```php
<?php
namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Http\Requests\StoreOrderRequest;
use App\Services\OrderService;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService
    ) {}

    public function index()
    {
        return Order::where('user_id', auth()->id())
            ->with('items')
            ->paginate(20);
    }

    public function store(StoreOrderRequest $request)
    {
        $order = $this->orderService->create($request->validated());
        return response()->json($order, 201);
    }

    public function show(Order $order)
    {
        $this->authorize('view', $order);
        return $order->load('items', 'user');
    }
}
```

### Form Request Validation
```php
<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'items.*.price' => 'required|numeric|min:0',
            'shipping_address' => 'required|array',
            'shipping_address.street' => 'required|string|max:255',
            'shipping_address.city' => 'required|string|max:100',
            'shipping_address.postal_code' => 'required|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Order must contain at least one item.',
            'items.*.quantity.max' => 'Maximum quantity per item is 100.',
        ];
    }
}
```

### Service Layer
```php
<?php
namespace App\Services;

use App\Models\Order;
use App\Jobs\ProcessPayment;
use App\Events\OrderCreated;

class OrderService
{
    public function __construct(
        private readonly InventoryService $inventory,
        private readonly PaymentService $payment
    ) {}

    public function create(array $data): Order
    {
        $order = \DB::transaction(function () use ($data) {
            $order = Order::create([
                'user_id' => auth()->id(),
                'total' => collect($data['items'])->sum(fn($i) => $i['price'] * $i['quantity']),
                'status' => 'pending',
            ]);

            foreach ($data['items'] as $item) {
                $order->items()->create($item);
                $this->inventory->reserve($item['product_id'], $item['quantity']);
            }

            return $order;
        });

        ProcessPayment::dispatch($order);
        OrderCreated::dispatch($order);

        return $order;
    }
}
```

### API Routes
```php
// routes/api.php
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\UserController;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('orders', OrderController::class);
    Route::get('user/profile', [UserController::class, 'profile']);
    Route::put('user/profile', [UserController::class, 'updateProfile']);
});
```

## Authentication

### Sanctum (SPA / Token)
```bash
php artisan install:api
```

```php
// config/sanctum.php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,localhost:8000'));

// Login
$token = $user->createToken('api-token', ['read:orders', 'write:orders'])->plainTextToken;
```

### Passport (OAuth2)
```bash
composer require laravel/passport
php artisan passport:install
```

## Queue + Horizon
```bash
composer require laravel/horizon
php artisan horizon:install
```

```php
// config/horizon.php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'minProcesses' => 1,
            'maxProcesses' => 10,
            'tries' => 3,
        ],
    ],
];
```

## Testing with Pest
```php
<?php
use App\Models\Order;
use App\Models\User;

uses(Tests\TestCase::class);

it('creates an order', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['price' => 1000]);

    $response = $this->actingAs($user)->postJson('/api/orders', [
        'items' => [['product_id' => $product->id, 'quantity' => 2, 'price' => 1000]],
        'shipping_address' => ['street' => '123 Main', 'city' => 'Hanoi', 'postal_code' => '10000'],
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['id', 'total', 'items']);
});

it('prevents unauthorized access', function () {
    $this->getJson('/api/orders')->assertStatus(401);
});
```

## Rules
- Place business logic in Service classes, never in controllers or models.
- Use Form Requests for validation — never validate in controllers.
- Use `authorize()` in Form Requests or Policies for access control.
- Always use `with()` for eager loading — never N+1 queries.
- Use `DB::transaction()` for multi-step operations.
- Queue long-running tasks — never process in request lifecycle.
- Use events for side effects (notifications, logging, webhooks).
- Use `config/` files for configuration — never hardcode.
- Always type-hint dependencies — let the container resolve them.
- Use Pest for testing — Feature tests for HTTP, Unit tests for services.

## References
  - references/artisan-commands.md — Laravel Artisan Commands
  - references/eloquent-orm.md — Laravel Eloquent ORM
  - references/laravel-middleware-validation.md — Laravel Middleware & Validation
  - references/laravel-queues.md — Laravel Queue Jobs
  - references/laravel-service-layer.md — Laravel Service Layer Pattern
  - references/laravel-testing.md — Laravel Testing
## Handoff
Next skill: php-pure — if user wants lightweight PHP without framework.
Next skill: php-zend — if user wants Laminas/Zend MVC framework.
Carry forward: PHP version, database driver, Laravel version, auth setup.
