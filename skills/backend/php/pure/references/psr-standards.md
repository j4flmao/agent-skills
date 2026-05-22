# PSR Standards Reference

## PSR-4: Autoloading

```json
{
  "autoload": {
    "psr-4": {
      "App\\": "src/",
      "App\\Test\\": "tests/"
    }
  }
}
```

## PSR-7: HTTP Messages

```php
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamInterface;
use Psr\Http\Message\UriInterface;

// ServerRequestInterface methods
$request->getMethod();              // GET, POST, etc.
$request->getUri();                 // UriInterface
$request->getHeaders();             // string[][]
$request->getHeader('Content-Type'); // string[]
$request->getBody();                // StreamInterface
$request->getParsedBody();          // array|object|null
$request->getQueryParams();         // array
$request->getAttributes();          // array
$request->withAttribute('key', $value); // clone with added attribute

// ResponseInterface
$response = new Response(200);
$response->withHeader('Content-Type', 'application/json');
$response->withBody($stream);
$response->withStatus(404);
```

## PSR-11: Container Interface

```php
interface ContainerInterface
{
    public function get(string $id): mixed;
    public function has(string $id): bool;
}

// Usage with php-di
$container = new \DI\Container();
$container->set(UserRepository::class, function() {
    return new UserRepository(new Database());
});
$service = $container->get(UserService::class);
```

## PSR-14: Event Dispatcher

```php
interface EventDispatcherInterface
{
    public function dispatch(object $event): object;
}

// Usage
class UserCreated
{
    public function __construct(public readonly User $user) {}
}

$dispatcher->dispatch(new UserCreated($user));
```

## PSR-15: HTTP Handlers

```php
// RequestHandlerInterface — processes a request and produces a response
interface RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface;
}

// MiddlewareInterface — processes request, delegates to handler
interface MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface;
}

// Example middleware
class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $token = $request->getHeaderLine('Authorization');
        if (!$token) {
            return new Response(401, [], json_encode(['error' => 'Unauthorized']));
        }
        $request = $request->withAttribute('user_id', decodeToken($token));
        return $handler->handle($request);
    }
}
```

## PSR-18: HTTP Client

```php
interface ClientInterface
{
    public function sendRequest(RequestInterface $request): ResponseInterface;
}

$client = new \GuzzleHttp\Client();
$response = $client->sendRequest(new Request('GET', 'https://api.example.com/users'));
```

## PSR-3: Logger Interface

```php
interface LoggerInterface
{
    public function emergency(string|\Stringable $message, array $context = []): void;
    public function alert(string|\Stringable $message, array $context = []): void;
    public function critical(string|\Stringable $message, array $context = []): void;
    public function error(string|\Stringable $message, array $context = []): void;
    public function warning(string|\Stringable $message, array $context = []): void;
    public function notice(string|\Stringable $message, array $context = []): void;
    public function info(string|\Stringable $message, array $context = []): void;
    public function debug(string|\Stringable $message, array $context = []): void;
    public function log($level, string|\Stringable $message, array $context = []): void;
}

// With Monolog
$log = new \Monolog\Logger('app');
$log->pushHandler(new \Monolog\Handler\StreamHandler('/var/log/app.log', \Monolog\Level::Error));
$log->error('Payment failed', ['order_id' => 123]);
```

## PSR-12: Extended Coding Style

```php
<?php
declare(strict_types=1);

namespace Vendor\Package;

use Vendor\Package\{ClassA, ClassB, ClassC as C};
use Vendor\Package\SomeNamespace\ClassD as D;

class Foo extends Bar implements FooInterface
{
    public function sampleMethod(int $arg1, string $arg2): void
    {
        if ($expr1) {
            // if body
        } elseif ($expr2) {
            // elseif body
        } else {
            // else body
        }

        $arr = [
            'key1' => 'value1',
            'key2' => 'value2',
        ];
    }
}
```

## PSR-6: Caching

```php
interface CacheItemPoolInterface
{
    public function getItem(string $key): CacheItemInterface;
    public function getItems(array $keys = []): iterable;
    public function hasItem(string $key): bool;
    public function clear(): bool;
    public function deleteItem(string $key): bool;
    public function deleteItems(array $keys): bool;
    public function save(CacheItemInterface $item): bool;
    public function defer(CacheItemInterface $item): bool;
    public function commit(): bool;
}
```
