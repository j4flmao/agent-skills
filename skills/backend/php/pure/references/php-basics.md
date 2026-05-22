# PHP Basics

## PHP 8.x Features

| Feature | Version | Example |
|---|---|---|
| **Named arguments** | 8.0 | `new User(name: 'John', email: 'john@x.com')` |
| **Attributes** | 8.0 | `#[Route('/api/users', methods: ['GET'])]` |
| **Constructor promotion** | 8.0 | `class User { public function __construct(private string $name) {} }` |
| **Match expression** | 8.0 | `$result = match($status) { 200 => 'OK', 404 => 'Not Found', default => 'Unknown' };` |
| **Enums** | 8.1 | `enum Status: string { case Active = 'active'; }` |
| **Readonly properties** | 8.1 | `public readonly string $id;` |
| **Fibers** | 8.1 | Cooperative multitasking |
| **SensitiveParameter** | 8.2 | Redact sensitive values in stack traces |
| **Randomizer** | 8.2 | `new Randomizer()->getInt(1, 100)` |
| **JSON validation** | 8.3 | `json_validate($string)` |
| **Override attribute** | 8.3 | `#[Override] public function save() {}` |
| **Property hooks** | 8.4 | `public string $name { set => trim($value); }` |
| **Lazy objects** | 8.4 | `$reflector->newLazyGhost(...)` |

## Types

```php
// Scalar types
int, float, string, bool, null, void, never, mixed, self, parent

// Compound types
array, object, callable, iterable, Countable, Stringable

// Union types (8.0+)
int|string, string|null (nullable), int|float|string

// Intersection types (8.1+)
Countable&Stringable

// DNF types (8.2+)
(must implements A)|null

// Returns
function find(int $id): ?User {}           // nullable return
function process(): never {}               // never returns (exit, throw)
function log(): void {}                     // returns nothing
```

## PSR-4 Autoloading

```json
{
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
}
```

## Built-in Web Server (Dev)

```bash
php -S localhost:8000 -t public
```

## Error Reporting

```php
// Production
error_reporting(0);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', '/var/log/php/error.log');

// Development
error_reporting(E_ALL);
ini_set('display_errors', '1');
```

## Session Configuration

```php
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', '1');
ini_set('session.sid_length', '48');
ini_set('session.sid_bits_per_character', '6');
ini_set('session.gc_maxlifetime', '7200');
```

## Common Composer Packages

| Package | Purpose |
|---|---|
| `vlucas/phpdotenv` | .env loading |
| `nyholm/psr7` | PSR-7 HTTP messages |
| `php-di/php-di` | PSR-11 DI container |
| `laminas/laminas-stratigility` | PSR-15 middleware |
| `phpunit/phpunit` | Testing |
| `phpstan/phpstan` | Static analysis |
| `squizlabs/php_codesniffer` | Code style |
| `monolog/monolog` | PSR-3 logging |
| `ramsey/uuid` | UUID generation |
| `respect/validation` | Input validation |
