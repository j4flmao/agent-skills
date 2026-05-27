# Laravel Service Layer Pattern

## Service Layer Architecture

### Directory Structure
```
app/Services/
├── Contracts/
│   ├── UserServiceInterface.php
│   └── PaymentServiceInterface.php
├── UserService.php
├── PaymentService.php
├── AuthService.php
└── Traits/
    └── HandlesExceptions.php
```

### Service Interface
```php
<?php

namespace App\Services\Contracts;

use App\Models\User;
use App\DataTransferObjects\UserData;

interface UserServiceInterface
{
    public function create(UserData $data): User;
    public function update(int $id, UserData $data): User;
    public function findById(int $id): ?User;
    public function delete(int $id): bool;
    public function activate(int $id): User;
    public function deactivate(int $id): User;
}
```

## Service Implementation

### Service Class
```php
<?php

namespace App\Services;

use App\DataTransferObjects\UserData;
use App\Events\UserCreated;
use App\Exceptions\UserNotFoundException;
use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\Contracts\UserServiceInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserService implements UserServiceInterface
{
    public function __construct(
        private readonly UserRepository $repository,
        private readonly AuthService $authService,
        private readonly NotificationService $notificationService,
    ) {}

    public function create(UserData $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = $this->repository->create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => bcrypt($data->password),
                'role' => $data->role ?? 'user',
                'status' => 'active',
            ]);

            $this->authService->assignDefaultPermissions($user);
            event(new UserCreated($user));

            return $user;
        });
    }

    public function update(int $id, UserData $data): User
    {
        $user = $this->findOrFail($id);

        return DB::transaction(function () use ($user, $data) {
            $this->repository->update($user, $data->only([
                'name', 'email', 'role',
            ]));

            if ($data->role) {
                $this->authService->syncRoles($user, $data->role);
            }

            return $user->fresh();
        });
    }

    public function findById(int $id): ?User
    {
        return $this->repository->findById($id);
    }

    public function delete(int $id): bool
    {
        $user = $this->findOrFail($id);

        return DB::transaction(function () use ($user) {
            $this->authService->revokeAllTokens($user);
            return $this->repository->delete($user);
        });
    }

    public function activate(int $id): User
    {
        $user = $this->findOrFail($id);
        $this->repository->update($user, ['status' => 'active']);
        Log::info('User activated', ['user_id' => $id]);
        return $user->fresh();
    }

    public function deactivate(int $id): User
    {
        $user = $this->findOrFail($id);
        $this->repository->update($user, ['status' => 'inactive']);
        $this->authService->revokeAllTokens($user);
        Log::info('User deactivated', ['user_id' => $id]);
        return $user->fresh();
    }

    private function findOrFail(int $id): User
    {
        $user = $this->repository->findById($id);

        if (!$user) {
            throw new UserNotFoundException("User with ID {$id} not found");
        }

        return $user;
    }
}
```

## Data Transfer Objects

### DTO Definition
```php
<?php

namespace App\DataTransferObjects;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class UserData
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly ?string $role = null,
        public readonly ?array $metadata = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            name: $data['name'],
            email: $data['email'],
            password: $data['password'],
            role: $data['role'] ?? null,
            metadata: $data['metadata'] ?? null,
        );
    }

    public function validate(): void
    {
        $validator = Validator::make([
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password,
        ], [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }
}
```

## Repository Layer

### Repository Implementation
```php
<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class UserRepository
{
    public function findById(int $id): ?User
    {
        return User::with(['roles', 'permissions'])->find($id);
    }

    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function update(User $user, array $data): bool
    {
        return $user->update($data);
    }

    public function delete(User $user): bool
    {
        return $user->delete();
    }

    public function findActive(int $perPage = 15): LengthAwarePaginator
    {
        return User::where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
```

## Exception Handling

### Service Exceptions
```php
<?php

namespace App\Exceptions;

use Exception;

class UserNotFoundException extends Exception
{
    public function __construct(string $message = 'User not found')
    {
        parent::__construct($message, 404);
    }

    public function render(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'error' => 'User not found',
            'message' => $this->getMessage(),
        ], 404);
    }
}
```

### Global Handler Registration
```php
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;

class Handler extends ExceptionHandler
{
    public function register(): void
    {
        $this->reportable(function (UserNotFoundException $e) {
            Log::warning($e->getMessage());
        });

        $this->renderable(function (UserNotFoundException $e) {
            return $e->render();
        });
    }
}
```

## Controller Usage

### Thin Controller
```php
<?php

namespace App\Http\Controllers\Api;

use App\DataTransferObjects\UserData;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\Contracts\UserServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly UserServiceInterface $userService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = UserData::fromRequest($request->validated());
        $user = $this->userService->create($data);

        return response()->json(new UserResource($user), 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = $this->userService->findById($id);

        if (!$user) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json(new UserResource($user));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = UserData::fromRequest($request->validated());
        $user = $this->userService->update($id, $data);

        return response()->json(new UserResource($user));
    }

    public function destroy(int $id): JsonResponse
    {
        $this->userService->delete($id);
        return response()->json(null, 204);
    }
}
```

## Service Provider Registration

### Binding Interfaces
```php
<?php

namespace App\Providers;

use App\Services\Contracts\UserServiceInterface;
use App\Services\UserService;
use Illuminate\Support\ServiceProvider;

class ServiceLayerServiceProvider extends ServiceProvider
{
    public array $singletons = [
        UserServiceInterface::class => UserService::class,
    ];

    public function register(): void
    {
        $this->app->bind(UserServiceInterface::class, UserService::class);
    }

    public function boot(): void
    {
        //
    }
}
```

## Key Points
- Service layer encapsulates business logic between controllers and repositories
- Interfaces enable testing with mock implementations
- DTOs provide type-safe data transfer between layers
- Repositories abstract database access behind a clean interface
- Controllers stay thin — they only handle HTTP concerns
- Service methods use DB::transaction for atomic operations
- Custom exceptions provide consistent error handling
- Service providers wire interfaces to implementations
- Event dispatching in services decouples side effects
- Constructor injection keeps services testable and explicit
