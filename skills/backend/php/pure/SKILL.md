---
name: php-pure
description: >
  Use this skill when the user says 'PHP', 'plain PHP', 'pure PHP',
  'PHP without framework', 'vanilla PHP', 'PHP routing', 'PSR-4',
  'PSR-7', 'PSR-15', 'PHP middleware', 'Composer', 'PHP autoloading',
  'PHP error handling', 'PHP monolith', 'PHP MVC from scratch',
  'PHP database', 'PDO', 'PHP template', 'PHP CLI script'.
  Covers: PHP project structure, PSR standards, Composer autoloading,
  routing (PSR-7/PSR-15), middleware pipeline, error handling,
  PDO database access, template rendering, security, testing.
  Do NOT use this for: Laravel (use php-laravel), Zend/Laminas (use
  php-zend), or framework-specific PHP questions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, php, pure, phase-7]
---

# PHP (Pure)

## Purpose
Build well-structured plain PHP applications without frameworks. Follow PSR standards, Composer autoloading, PSR-7/PSR-15 middleware, clean routing, PDO database access, and proper error handling.

## Agent Protocol

### Trigger
Exact user phrases: "PHP project", "plain PHP", "vanilla PHP", "PHP without framework", "PSR-4", "PSR-7", "PSR-15", "PHP middleware", "Composer autoload", "PHP routing", "PHP error handler", "PDO", "PHP monolith", "PHP MVC".

### Input Context
- PHP version (8.1+ recommended, 8.3+ current).
- Web server (Apache mod_php, Nginx FPM, built-in server).
- Database (MySQL, PostgreSQL, SQLite).
- Template engine (PHP itself, Twig, Blade standalone).
- Existing project structure.

### Output Artifact
PHP files and directory structure. No extraneous explanation.

### Response Format
PHP code only. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Project structure follows PSR-4 autoloading.
- [ ] Front controller pattern with single entry point (`public/index.php`).
- [ ] Routing implemented (PSR-7/PSR-15 or custom).
- [ ] Middleware pipeline for auth, logging, CORS, error handling.
- [ ] Database abstraction via PDO with prepared statements.
- [ ] Error handling with custom error handler + exception handler.
- [ ] Security: XSS, CSRF, SQL injection prevention, password hashing.
- [ ] Environment configuration (.env via vlucas/phpdotenv).

### Max Response Length
Direct file output. No response text.

## Project Structure

```
project/
├── public/
│   └── index.php              # Front controller
├── src/
│   ├── Middleware/
│   │   ├── AuthMiddleware.php
│   │   ├── CorsMiddleware.php
│   │   ├── LoggerMiddleware.php
│   │   └── CsrfMiddleware.php
│   ├── Controller/
│   │   ├── UserController.php
│   │   └── OrderController.php
│   ├── Service/
│   │   └── UserService.php
│   ├── Repository/
│   │   └── UserRepository.php
│   ├── Model/
│   │   ├── User.php
│   │   └── Order.php
│   ├── Router.php
│   ├── Request.php
│   ├── Response.php
│   ├── Database.php
│   └── Exception/
│       ├── HttpException.php
│       └── ValidationException.php
├── config/
│   ├── app.php
│   ├── database.php
│   └── routes.php
├── templates/
│   └── user/
│       ├── index.php
│       └── show.php
├── migrations/
│   └── 001_create_users.php
├── tests/
│   └── Unit/
│       └── UserTest.php
├── .env
├── .env.example
├── composer.json
└── phpunit.xml
```

## Front Controller (public/index.php)

```php
<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Router;
use App\Request;
use App\Middleware\CorsMiddleware;
use App\Middleware\LoggerMiddleware;
use App\Middleware\ErrorHandlerMiddleware;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$request = Request::fromGlobals();

$router = require __DIR__ . '/../config/routes.php';

$middleware = new \App\Middleware\Pipeline();
$middleware->add(new ErrorHandlerMiddleware());
$middleware->add(new CorsMiddleware());
$middleware->add(new LoggerMiddleware());

$response = $middleware->handle($request, fn($req) => $router->dispatch($req));

$response->send();
```

## Routing (PSR-7 / PSR-15)

```php
<?php
declare(strict_types=1);

namespace App;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ResponseInterface;

class Router implements RequestHandlerInterface
{
    private array $routes = [];

    public function get(string $path, callable $handler, array $middleware = []): self
    {
        $this->routes['GET'][$path] = ['handler' => $handler, 'middleware' => $middleware];
        return $this;
    }

    public function post(string $path, callable $handler, array $middleware = []): self
    {
        $this->routes['POST'][$path] = ['handler' => $handler, 'middleware' => $middleware];
        return $this;
    }

    public function dispatch(Request $request): Response
    {
        $method = $request->getMethod();
        $uri = parse_url($request->getUri(), PHP_URL_PATH);
        $uri = rtrim($uri, '/') ?: '/';

        foreach ($this->routes[$method] ?? [] as $route => $config) {
            $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $route);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $request = $request->withParams($params);

                $handler = $config['handler'];
                foreach (array_reverse($config['middleware']) as $mw) {
                    $handler = fn($req) => $mw->process($req, new class($handler) implements RequestHandlerInterface {
                        public function __construct(private $handler) {}
                        public function handle(ServerRequestInterface $request): ResponseInterface {
                            return ($this->handler)($request);
                        }
                    });
                }

                return $handler($request);
            }
        }

        throw new HttpException(404, 'Not Found');
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return $this->dispatch($request);
    }
}
```

## PDO Database Layer

```php
<?php
declare(strict_types=1);

namespace App;

class Database
{
    private static ?\PDO $instance = null;

    public static function connect(): \PDO
    {
        if (self::$instance === null) {
            $dsn = sprintf(
                '%s:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $_ENV['DB_DRIVER'],
                $_ENV['DB_HOST'],
                $_ENV['DB_PORT'],
                $_ENV['DB_NAME']
            );
            self::$instance = new \PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS'], [
                \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$instance;
    }

    public static function query(string $sql, array $params = []): \PDOStatement
    {
        $stmt = self::connect()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetch(string $sql, array $params = []): ?array
    {
        $result = self::query($sql, $params);
        return $result->fetch() ?: null;
    }

    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    public static function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        self::query("INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})", array_values($data));
        return (int) self::connect()->lastInsertId();
    }
}
```

## Error Handling

```php
<?php
declare(strict_types=1);

namespace App\Exception;

class HttpException extends \RuntimeException
{
    public function __construct(
        public readonly int $statusCode,
        string $message = '',
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);
    }
}

class ValidationException extends HttpException
{
    public function __construct(
        public readonly array $errors,
        string $message = 'Validation failed'
    ) {
        parent::__construct(422, $message);
    }
}
```

```php
<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Exception\HttpException;

class ErrorHandlerMiddleware
{
    public function process(callable $next): callable
    {
        return function ($request) use ($next) {
            try {
                return $next($request);
            } catch (HttpException $e) {
                return json_response($e->statusCode, [
                    'error' => ['code' => $e->getCode() ?: 'HTTP_ERROR', 'message' => $e->getMessage()]
                ]);
            } catch (\PDOException $e) {
                error_log('Database: ' . $e->getMessage());
                return json_response(500, [
                    'error' => ['code' => 'DB_ERROR', 'message' => 'Database error']
                ]);
            } catch (\Throwable $e) {
                error_log('Unhandled: ' . $e->getMessage());
                return json_response(500, [
                    'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'Internal server error']
                ]);
            }
        };
    }
}
```

## Security

```php
<?php
declare(strict_types=1);

// Password hashing
public function hashPassword(string $password): string
{
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

// Verify password
public function verifyPassword(string $password, string $hash): bool
{
    return password_verify($password, $hash);
}

// CSRF token
public function generateCsrfToken(): string
{
    return bin2hex(random_bytes(32));
}

// XSS prevention (output escaping)
function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// SQL injection prevention (use PDO prepared statements — never raw concatenation)
// ✅ Always: $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
// ❌ Never: $pdo->query("SELECT * FROM users WHERE id = $id");
```

## Rules
- Always use `declare(strict_types=1)` in every PHP file.
- Follow PSR-4 autoloading with Composer.
- Never concatenate SQL — use PDO prepared statements exclusively.
- Never output unsanitized user input — use `htmlspecialchars()` with ENT_QUOTES.
- Always hash passwords with `password_hash(PASSWORD_BCRYPT, ['cost' => 12])`.
- Use environment variables for all configuration — never hardcode secrets.
- Log errors, never display them in production (`display_errors=0`).
- Set `session.cookie_httponly=1`, `session.cookie_secure=1`, `session.cookie_samesite="Lax"`.
- Use `error_log()` for logging, not `echo`/`var_dump` in production.

## References
- `references/php-basics.md` — PHP 8.x features, types, attributes, named arguments
- `references/psr-standards.md` — PSR-4, PSR-7, PSR-11, PSR-14, PSR-15, PSR-18
- `references/php-security.md` — OWASP PHP, crypto, session security, input validation

## Handoff
Next skill: php-laravel — if user wants Laravel framework instead.
Next skill: php-zend — if user wants Laminas/Zend framework instead.
Carry forward: PHP version, database driver, project structure.
