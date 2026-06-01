---
name: php-pure
description: >
  Use this skill when building PHP applications without a framework — PSR standards, routing, middleware, database access, error handling, and security. This skill enforces: PSR-4 autoloading, PSR-7 request/response, PSR-15 middleware, PSR-11 container, PSR-3 logging. Requires PHP 8.1+. Do NOT use for: Laravel, Symfony, WordPress, or framework-specific PHP development.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, php, pure, phase-4]
---

# PHP (Pure/Standard)

## Purpose
Build PHP applications without a framework — PSR standards-based architecture, routing, middleware, database access, type-safe with PHP 8.x features, and security-first patterns.

## Agent Protocol

### Trigger
User request includes: `pure PHP`, `PHP without framework`, `PHP PSR`, `PHP routing`, `PHP middleware`, `PHP DI`, `PHP database`, `PHP 8 attributes`, `PHP enum`.

### Input Context
- PHP version (8.1+)
- PSR implementations (PSR-7, PSR-15, PSR-11, PSR-3)
- Database (PDO, Doctrine DBAL, MySQLi)
- Container (PHP-DI, custom)

### Output Artifact
Project structure, router class, middleware chain, controller, database repository.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- PSR-4 autoloading configured
- PSR-7 request/response handling
- PSR-15 middleware pipeline
- PSR-11 container for DI
- Route matching with attributes or configuration
- PDO with prepared statements

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Micro-framework vs Full Framework vs Pure PHP

| Criterion | Pure PHP (PSR stack) | Micro-framework (Slim) | Full Framework (Laravel) |
|-----------|---------------------|----------------------|--------------------------|
| Control | Complete | High | Framework conventions |
| Setup time | High | Low | Very low |
| Performance | Best | Good | Moderate |
| Learning curve | Steep | Low | Moderate |
| Flexibility | Max | High | Constrained by conventions |

Decision: Full control + performance → Pure PHP. Quick REST API → Slim/Fat-Free. Full features → Laravel/Symfony.

### PHP 8 Features for Clean Architecture

| Feature | Use | Benefit |
|---------|-----|---------|
| Attributes | Route definitions, validation, middleware | Declarative metadata without annotations |
| Enums | Status, roles, types | Type-safe constants |
| Readonly properties | DTOs, value objects | Immutability by default |
| Named arguments | Constructor DI | Self-documenting dependencies |
| Match expression | Error mapping, event routing | Exhaustive pattern matching |
| Union types | Multi-type returns | Type-safe polymorphic returns |
| Constructor promotion | DTOs, services | Reduces boilerplate |

## Workflow

### Step 1: Project Structure

```
project/
  public/
    index.php                 # Entry point
  src/
    Controllers/
      UserController.php
    Middleware/
      AuthMiddleware.php
      CorsMiddleware.php
      ErrorHandlerMiddleware.php
    Router/
      Router.php
      Route.php
    Request/
      Request.php             # PSR-7 implementation
    Response/
      Response.php
    Container/
      Container.php           # PSR-11 implementation
    Repository/
      UserRepository.php
    Service/
      UserService.php
    Exception/
      NotFoundException.php
      ValidationException.php
    Enum/
      UserRole.php
  config/
    routes.php
    services.php
  composer.json
```

### Step 2: Composer Setup and PSR-4

```json
{
  "name": "app/api",
  "require": {
    "php": ">=8.1",
    "psr/http-message": "^1.0",
    "psr/container": "^2.0",
    "psr/log": "^3.0"
  },
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
}
```

### Step 3: Router with PHP 8 Attributes

```php
<?php
// src/Router/Route.php
namespace App\Router;

#[\Attribute(\Attribute::TARGET_METHOD | \Attribute::IS_REPEATABLE)]
class Route
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
    ) {}
}

// src/Router/Router.php
namespace App\Router;

use App\Exception\NotFoundException;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface;

class Router
{
    private array $routes = [];

    public function register(string $class): void
    {
        $reflection = new \ReflectionClass($class);
        foreach ($reflection->getMethods() as $method) {
            foreach ($method->getAttributes(Route::class) as $attribute) {
                $route = $attribute->newInstance();
                $this->routes[] = [
                    'method' => $route->method,
                    'path' => $route->path,
                    'class' => $class,
                    'handler' => $method->getName(),
                ];
            }
        }
    }

    public function dispatch(ServerRequestInterface $request, ContainerInterface $container): mixed
    {
        $method = $request->getMethod();
        $uri = $request->getUri()->getPath();

        foreach ($this->routes as $route) {
            $params = $this->match($route['method'], $route['path'], $method, $uri);
            if ($params !== null) {
                $controller = $container->get($route['class']);
                return $controller->{$route['handler']}($request, ...$params);
            }
        }

        throw new NotFoundException('Route not found');
    }

    private function match(string $routeMethod, string $routePath, string $requestMethod, string $requestUri): ?array
    {
        if ($routeMethod !== $requestMethod) return null;
        $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $routePath);
        $pattern = '#^' . $pattern . '$#';
        if (preg_match($pattern, $requestUri, $matches)) {
            return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        }
        return null;
    }
}

// src/Enum/UserRole.php
namespace App\Enum;

enum UserRole: string
{
    case Admin = 'admin';
    case User = 'user';
    case Moderator = 'moderator';
}

// src/Controllers/UserController.php
namespace App\Controllers;

use App\Router\Route;
use App\Service\UserService;
use Psr\Http\Message\ServerRequestInterface;

class UserController
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    #[Route('GET', '/users')]
    public function list(ServerRequestInterface $request): array
    {
        $page = (int) ($request->getQueryParams()['page'] ?? 1);
        return $this->userService->paginate($page);
    }

    #[Route('GET', '/users/{id}')]
    public function getById(ServerRequestInterface $request, string $id): ?array
    {
        $user = $this->userService->findById($id);
        if (!$user) throw new NotFoundException('User not found');
        return $user;
    }

    #[Route('POST', '/users')]
    public function create(ServerRequestInterface $request): array
    {
        $data = json_decode((string) $request->getBody(), true);
        return $this->userService->create($data);
    }
}
```

### Step 4: Middleware Pipeline (PSR-15)

```php
<?php
// src/Middleware/Pipeline.php
namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class Pipeline implements RequestHandlerInterface
{
    private array $middleware = [];
    private int $index = 0;

    public function __construct(
        private readonly RequestHandlerInterface $handler,
    ) {}

    public function add(MiddlewareInterface $middleware): void
    {
        $this->middleware[] = $middleware;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if ($this->index < count($this->middleware)) {
            $middleware = $this->middleware[$this->index];
            $this->index++;
            return $middleware->process($request, $this);
        }
        return $this->handler->handle($request);
    }
}

// src/Middleware/AuthMiddleware.php
namespace App\Middleware;

use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly string $jwtSecret,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $header = $request->getHeaderLine('Authorization');
        if (!str_starts_with($header, 'Bearer ')) {
            throw new UnauthorizedException('Missing token');
        }

        try {
            $token = substr($header, 7);
            $payload = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
            $request = $request->withAttribute('user_id', $payload->sub);
            $request = $request->withAttribute('user_role', $payload->role);
        } catch (\Exception) {
            throw new UnauthorizedException('Invalid token');
        }

        return $handler->handle($request);
    }
}
```

### Step 5: PDO Database Access

```php
<?php
// src/Repository/UserRepository.php
namespace App\Repository;

use App\Enum\UserRole;
use PDO;

class UserRepository
{
    public function __construct(
        private readonly PDO $pdo,
    ) {}

    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (id, name, email, password, role) VALUES (:id, :name, :email, :password, :role) RETURNING *'
        );
        $stmt->execute([
            ':id' => uuid_create(),
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':password' => password_hash($data['password'], PASSWORD_BCRYPT),
            ':role' => $data['role'] ?? UserRole::User->value,
        ]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function paginate(int $page, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

### Step 6: Entry Point

```php
<?php
// public/index.php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Middleware\CorsMiddleware;
use App\Middleware\ErrorHandlerMiddleware;
use App\Middleware\Pipeline;
use App\Router\Router;
use App\Container\Container;
use App\Handler\AppHandler;
use GuzzleHttp\Psr7\ServerRequest;
use GuzzleHttp\Psr7\Response;

// Build container (PSR-11)
$container = new Container(require __DIR__ . '/../config/services.php');

// Build router
$router = new Router();
$router->register(\App\Controllers\UserController::class);

// Build middleware pipeline
$handler = new AppHandler($router, $container);
$pipeline = new Pipeline($handler);
$pipeline->add(new ErrorHandlerMiddleware());
$pipeline->add(new CorsMiddleware(['https://app.example.com']));
$pipeline->add($container->get(\App\Middleware\AuthMiddleware::class));

// Dispatch
$request = ServerRequest::fromGlobals();
$response = $pipeline->handle($request);

// Send response
http_response_code($response->getStatusCode());
foreach ($response->getHeaders() as $name => $values) {
    foreach ($values as $value) {
        header("$name: $value");
    }
}
echo $response->getBody();
```

## Implementation Patterns

### Pattern: PSR-11 Container

```php
<?php
// src/Container/Container.php
namespace App\Container;

use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Container\ContainerExceptionInterface;

class Container implements ContainerInterface
{
    private array $instances = [];
    private array $definitions = [];

    public function __construct(array $definitions = [])
    {
        $this->definitions = $definitions;
    }

    public function get(string $id): mixed
    {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        if (isset($this->definitions[$id])) {
            $this->instances[$id] = $this->definitions[$id]($this);
            return $this->instances[$id];
        }

        if (class_exists($id)) {
            return $this->autowire($id);
        }

        throw new class("Service '$id' not found") extends \Exception implements NotFoundExceptionInterface {};
    }

    public function has(string $id): bool
    {
        return isset($this->definitions[$id]) || class_exists($id);
    }

    private function autowire(string $class): object
    {
        $reflection = new \ReflectionClass($class);
        $constructor = $reflection->getConstructor();

        if (!$constructor) {
            return $reflection->newInstance();
        }

        $params = array_map(fn($p) => $this->get($p->getType()->getName()), $constructor->getParameters());
        return $reflection->newInstanceArgs($params);
    }
}
```

## Production Considerations

### Performance
- OPcache enabled: `opcache.enable=1`, `opcache.memory_consumption=256`
- JIT for CPU-bound workloads: `opcache.jit=1255`, `opcache.jit_buffer_size=256M`
- Database: PDO with persistent connections, connection pooling via pgbouncer
- Use `readonly` classes for DTOs to reduce memory overhead
- Enable `zend.exception_ignore_args=1` in production to reduce exception overhead

### Error Handling
```php
// Error handler that converts PHP errors to exceptions
set_error_handler(function (int $severity, string $message, string $file, int $line): void {
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function (\Throwable $e): void {
    $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['error' => ['code' => 'INTERNAL_ERROR', 'message' => $code >= 500 ? 'Server error' : $e->getMessage()]]);
});
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `require`/`include` for dependencies | No autoloading, fragile | PSR-4 autoloader via Composer |
| `mysqli_*` functions | Deprecated, insecure | PDO with prepared statements |
| `extract($_POST)` | Variable injection, security risk | Type-safe request objects |
| Global `$_SESSION` access | Hard to test, coupled to superglobals | Session interface via container |
| String interpolation in SQL | SQL injection | Prepared statements always |
| `eval()` or `create_function()` | Code injection | Never use |
| Mixed HTML and PHP in views | Maintenance nightmare | Template engine (Twig, Plates) |

## Security Considerations
- PDO prepared statements prevent SQL injection — always use placeholders
- `password_hash(PASSWORD_BCRYPT)` for passwords — never manual hashing
- `htmlspecialchars($output, ENT_QUOTES)` for HTML output escaping
- `strip_tags()` on user input for display, but preserve on DB storage
- CSRF: generate tokens via `bin2hex(random_bytes(32))`, validate on state changes
- Set `session.cookie_httponly=1`, `session.cookie_secure=1`, `session.cookie_samesite=Lax`
- CORS headers on all API responses — restrict origins, methods, headers
- Rate limiting via IP-based counter in Redis or APCu

## Testing Strategies

```php
<?php
// tests/UserRepositoryTest.php
use PHPUnit\Framework\TestCase;
use App\Repository\UserRepository;

class UserRepositoryTest extends TestCase
{
    private static PDO $pdo;

    public static function setUpBeforeClass(): void
    {
        self::$pdo = new PDO('sqlite::memory:');
        self::$pdo->exec('CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT)');
    }

    public function test_create_and_find_user(): void
    {
        $repo = new UserRepository(self::$pdo);
        $created = $repo->create([
            'name' => 'Test',
            'email' => 'test@test.com',
            'password' => 'secret123',
        ]);
        $found = $repo->findById($created['id']);
        $this->assertEquals('Test', $found['name']);
    }
}
```

Use PHPUnit 10+ with Pest for BDD-style tests. Use `vfsStream` for filesystem mocking. Use `phpmock` for function mocking in legacy code.

## Rules
- PSR-4 autoloading via Composer — no manual `require`/`include` for classes.
- PDO with named parameters for all database queries — never string interpolation.
- PHP 8 attributes for metadata (routes, validation) — never docblock annotations.
- Services receive dependencies via constructor injection — no service locator pattern.
- Middleware pipeline with PSR-15 — each middleware does one thing.
- Request/Response as PSR-7 objects — never use `$_GET`, `$_POST`, `$_SERVER` directly.
- Error handling via exceptions → throw vs try/catch at boundary.
- `declare(strict_types=1)` at the top of every PHP file for type safety.
- `readonly` properties on DTOs and value objects for immutability.

## References
  - references/php-basics.md — PHP Basics Reference
  - references/php-database.md — Database Access Patterns
  - references/php-modern-practices.md — Modern PHP Practices
  - references/php-routing.md — Routing Patterns
  - references/php-security.md — PHP Security
  - references/psr-standards.md — PSR Standards Reference
## Handoff
Hand off to `backend/php/laravel/SKILL.md` for Laravel-specific patterns or `backend/universal/api-response/SKILL.md` for API response formatting.
