---
name: php-laravel
description: >
  Use this skill when building Laravel applications — MVC structure, Eloquent ORM, service layer, validation, queues, and testing. This skill enforces: thin controllers, service layer for business logic, Eloquent best practices with eager loading, form request validation, and queue job structure. Requires Laravel 10+ or 11+. Do NOT use for: Symfony, WordPress, non-Laravel PHP frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, php, laravel, phase-4]
---

# Laravel

## Purpose
Build Laravel applications with clean MVC structure, service layer separation, Eloquent ORM best practices, form request validation, queue jobs, and comprehensive testing.

## Agent Protocol

### Trigger
User request includes: `Laravel structure`, `Laravel app`, `Eloquent`, `Laravel service`, `Laravel validation`, `Laravel queue`, `Laravel testing`, `Laravel job`, `Laravel seeder`.

### Input Context
- Laravel version (10.x, 11.x)
- PHP version (8.1+)
- Database (MySQL, PostgreSQL, SQLite)
- Features (Auth, Queues, Broadcasting, Notifications, Cashier)

### Output Artifact
Controller structure, service class, Eloquent model, form request, job class, seeder, test.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Controller delegates to service layer
- Eloquent model with scopes, relations, casts
- Form request class with validation rules
- Service class with business logic
- Queue job with typed properties
- Feature/unit tests for critical paths

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Service Layer vs Repository vs Active Record

| Criterion | Service Layer | Repository | Active Record (Vanilla) |
|-----------|--------------|------------|------------------------|
| Business logic location | Service class | Repository class | Model methods |
| Query abstraction | Service delegates to model | Repository encapsulates | Direct in controllers |
| Testability | Easy (mock service) | Moderate (mock repo) | Hard (Eloquent facade) |
| Complexity | Moderate | High (extra layer) | Low |
| Laravel fit | Natural (dedicated directories) | Possible but uncommon | Default pattern |

Decision: Business logic outside controllers → Service Layer (most common in production Laravel apps). Need query abstraction → Repository. Simple CRUD → Active Record in controllers is acceptable.

### Form Request vs Controller Validation

| Criterion | Form Request | Controller validate() | Manual validation |
|-----------|-------------|----------------------|-------------------|
| Reusability | Across controllers/actions | Per method | Per method |
| Authorization | Built-in authorize() | Manual in controller | Manual |
| Naming | `StoreUserRequest` | Inline array | Inline array |
| Logic complexity | Custom rules, after hooks | Simple rules | Simple rules |

Decision: Reusable validation → Form Request. Simple one-off → Controller `validate()`. Complex custom logic → Form Request with custom rules.

## Workflow

### Step 1: Directory Structure

```
app/
  Http/
    Controllers/
      Api/
        V1/
          UserController.php
          OrderController.php
    Requests/
      StoreUserRequest.php
      UpdateUserRequest.php
    Resources/
      UserResource.php
  Models/
    User.php
    Order.php
  Services/
    UserService.php
    OrderService.php
  Jobs/
    ProcessOrderJob.php
  Exceptions/
    ConflictException.php
database/
  migrations/
    xxxx_create_users_table.php
  factories/
    UserFactory.php
  seeders/
    UserSeeder.php
routes/
  api.php
tests/
  Feature/
    UserTest.php
  Unit/
    UserServiceTest.php
```

### Step 2: Eloquent Model

```php
<?php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'created_at' => 'datetime:Y-m-d\TH:i:s\Z',
        ];
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    // Relations
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    // Accessors
    public function getInitialsAttribute(): string
    {
        $parts = explode(' ', $this->name);
        return collect($parts)->map(fn($p) => strtoupper($p[0]))->implode('');
    }

    // Events
    protected static function booted(): void
    {
        static::created(function ($user) {
            event(new UserCreated($user));
        });
    }
}
```

### Step 3: Form Request Validation

```php
<?php
// app/Http/Requests/StoreUserRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create-users') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(['admin', 'user', 'moderator'])],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower($this->email),
        ]);
    }
}
```

### Step 4: Service Layer

```php
<?php
// app/Services/UserService.php
namespace App\Services;

use App\Exceptions\ConflictException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;

class UserService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function create(array $data): User
    {
        if (User::where('email', $data['email'])->exists()) {
            throw new ConflictException('Email already exists');
        }

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => $data['role'] ?? 'user',
            ]);

            $this->notifications->sendWelcomeEmail($user);

            return $user;
        });
    }

    public function findById(string $id): ?User
    {
        return User::with('posts')->find($id);
    }

    public function paginate(int $perPage = 20): LengthAwarePaginator
    {
        return User::active()
            ->withCount('posts')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function update(string $id, array $data): User
    {
        $user = User::findOrFail($id);
        $user->update($data);
        return $user->fresh();
    }

    public function delete(string $id): void
    {
        User::findOrFail($id)->delete();
    }
}
```

### Step 5: API Resource (DTO)

```php
<?php
// app/Http/Resources/UserResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'posts_count' => $this->whenCounted('posts'),
            'created_at' => $this->created_at,
        ];
    }
}
```

### Step 6: Thin Controller

```php
<?php
// app/Http/Controllers/Api/V1/UserController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(): JsonResponse
    {
        $users = $this->userService->paginate();
        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());
        return response()->json([
            'data' => new UserResource($user),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $user = $this->userService->findById($id);
        abort_if(!$user, 404, 'User not found');
        return response()->json(['data' => new UserResource($user)]);
    }

    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = $this->userService->update($id, $request->validated());
        return response()->json(['data' => new UserResource($user)]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->userService->delete($id);
        return response()->json(null, 204);
    }
}
```

### Step 7: Queue Job

```php
<?php
// app/Jobs/ProcessOrderJob.php
namespace App\Jobs;

use App\Models\Order;
use App\Services\InventoryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(
        private readonly Order $order,
    ) {}

    public function handle(InventoryService $inventory): void
    {
        try {
            $inventory->reserveItems($this->order);
            $this->order->markAsProcessing();
        } catch (InsufficientInventoryException $e) {
            $this->order->markAsFailed($e->getMessage());
            $this->fail($e);
        }
    }

    public function failed(\Throwable $e): void
    {
        $this->order->markAsFailed($e->getMessage());
        event(new OrderFailed($this->order));
    }
}
```

### Step 8: Exception Handler

```php
<?php
// app/Exceptions/Handler.php
namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class Handler extends ExceptionHandler
{
    public function render($request, \Throwable $e)
    {
        if ($request->expectsJson()) {
            return match (true) {
                $e instanceof ConflictException => response()->json([
                    'error' => ['code' => 'CONFLICT', 'message' => $e->getMessage()],
                ], 409),
                $e instanceof ValidationException => response()->json([
                    'error' => ['code' => 'VALIDATION_ERROR', 'details' => $e->errors()],
                ], 422),
                $e instanceof NotFoundHttpException => response()->json([
                    'error' => ['code' => 'NOT_FOUND', 'message' => 'Resource not found'],
                ], 404),
                $e instanceof HttpException => response()->json([
                    'error' => ['code' => 'ERROR', 'message' => $e->getMessage()],
                ], $e->getStatusCode()),
                default => response()->json([
                    'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'An error occurred'],
                ], 500),
            };
        }

        return parent::render($request, $e);
    }
}
```

## Implementation Patterns

### Pattern: Caching with Cache Tags

```php
public function findWithCache(string $id): ?User
{
    return Cache::tags(['users'])->remember("user.{$id}", 3600, function () use ($id) {
        return User::with('posts')->find($id);
    });
}

public function invalidateUserCache(string $id): void
{
    Cache::tags(['users'])->forget("user.{$id}");
}
```

## Production Considerations

### Eloquent Performance
- Always use `with()` or `load()` to eager load — never lazy load in Blade
- Use `cursor()` or `chunk()` for large datasets, never `all()`
- Add indexes in migrations for all foreign keys and frequently queried columns
- Use `select` to limit columns: `User::select(['id', 'name', 'email'])`
- Avoid N+1: install Laravel Debugbar or Telescope in development to detect

### Horizon/Queue Configuration
```php
// config/horizon.php — production queue management
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'processes' => 3,
            'tries' => 3,
        ],
    ],
],
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Business logic in controller | Untestable, violates SRP | Delegate to service class |
| Global `active()` scope on User | Hidden filter | Explicit scopes in queries |
| N+1 queries in Blade | 100+ SQL queries per page | Eager load with `with()` |
| `all()` on large tables | Memory exhaustion | Use `cursor()`, `chunk()`, or paginate |
| Events/Signals for non-decoupled concerns | Hard to trace flow | Use listeners for side effects |
| `dd()`/`dump()` in committed code | Breaks API responses | Use logger instead |

## Security Considerations
- `Hash::make()` for passwords — never plain text or MD5/SHA
- Form Request `authorize()` for permission checks
- `$guarded` or `$fillable` on all models — never unguarded
- CSRF protection enabled by default — never disable on state-changing routes
- Rate limiting via `RateLimiter` facade or `throttle` middleware
- SQL injection: Eloquent is safe (parameterized), but `DB::raw()` can be vulnerable
- XSS: `{{ }}` Blade syntax auto-escapes; `{!! !!}` only for trusted HTML

## Testing Strategies

```php
// tests/Feature/UserControllerTest.php
class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_user(): void
    {
        $response = $this->postJson('/api/v1/users', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'name', 'email']]);
    }

    public function test_duplicate_email_returns_conflict(): void
    {
        User::factory()->create(['email' => 'john@example.com']);

        $response = $this->postJson('/api/v1/users', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(409);
    }
}
```

Use `RefreshDatabase` or `DatabaseTransactions` trait for isolation. Use `Http` facade fake for external API calls. Use `Queue::fake()` to test job dispatching. Use `Bus::fake()` to test command dispatching.

## Rules
- Controllers are thin — validation in Form Requests, business logic in Services.
- Eloquent models have `$fillable`, `$casts`, type-hinted relations, and query scopes.
- Form Requests contain validation rules and authorization logic.
- Service classes are constructor-injected into controllers.
- Queue jobs use typed constructor properties and `$tries`/`$backoff` for retry config.
- API routes return JSON responses with `Resource` classes for DTO transformation.
- Exception handling via `Handler::render()` for consistent error responses.
- Caching with `Cache::tags()` for invalidatable cache groups.
- All DB queries use eager loading (`with()`) to prevent N+1.
- Migrations are always backward-compatible — never drop columns without deprecation.

## References
  - references/artisan-commands.md — Artisan Commands
  - references/eloquent-orm.md — Eloquent ORM Patterns
  - references/laravel-middleware-validation.md — Middleware and Validation
  - references/laravel-queues.md — Queue Configuration
  - references/laravel-service-layer.md — Service Layer Pattern
  - references/laravel-testing.md — Testing Laravel
## Handoff
Hand off to `backend/php/pure/SKILL.md` for non-Laravel PHP patterns or `backend/universal/api-response/SKILL.md` for API response formatting.
