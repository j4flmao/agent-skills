# Mezzio API Development

## Mezzio Project Structure

```
project/
├── src/
│   ├── App/
│   │   ├── ConfigProvider.php       # DI config
│   │   ├── Handler/
│   │   │   ├── ListUsersHandler.php
│   │   │   ├── CreateUserHandler.php
│   │   │   └── GetUserHandler.php
│   │   ├── Middleware/
│   │   │   ├── AuthenticationMiddleware.php
│   │   │   └── ValidationMiddleware.php
│   │   └── Service/
│   │       └── UserService.php
├── config/
│   ├── container.php                 # DI container setup
│   ├── router.php                    # Route definitions
│   └── autoload/
│       └── database.local.php
├── public/
│   └── index.php                     # Entry point
├── composer.json
└── phpunit.xml
```

## Entry Point

```php
<?php
// public/index.php
declare(strict_types=1);

use Mezzio\AppFactory;
use Mezzio\MiddlewareFactory;
use Laminas\Diactoros\ServerRequestFactory;

chdir(dirname(__DIR__));
require __DIR__ . '/../vendor/autoload.php';

/** @var \Psr\Container\ContainerInterface $container */
$container = require __DIR__ . '/../config/container.php';

$app = AppFactory::create($container);
(require __DIR__ . '/../config/router.php')($app);
$app->run();
```

## Config Provider

```php
<?php
// src/App/ConfigProvider.php
namespace App;

class ConfigProvider
{
    public function __invoke(): array
    {
        return [
            'dependencies' => $this->getDependencies(),
        ];
    }

    public function getDependencies(): array
    {
        return [
            'factories' => [
                Handler\ListUsersHandler::class => Handler\ListUsersHandlerFactory::class,
                Handler\CreateUserHandler::class => Handler\CreateUserHandlerFactory::class,
                Middleware\AuthenticationMiddleware::class => Middleware\AuthenticationMiddlewareFactory::class,
                Service\UserService::class => Service\UserServiceFactory::class,
            ],
        ];
    }
}
```

## Router Config

```php
<?php
// config/router.php
declare(strict_types=1);

use Mezzio\Application;
use Mezzio\Middleware\AuthenticationMiddleware;
use App\Handler;

return function (Application $app) {
    // JSON error handler
    $app->pipe(\Mezzio\Helper\ContentLengthMiddleware::class);

    // Pipeline
    $app->pipe('/api', [
        \Mezzio\Middleware\AuthenticationMiddleware::class,
        \Mezzio\Helper\BodyParams\BodyParamsMiddleware::class,
    ]);

    // Routes
    $app->get('/api/users', Handler\ListUsersHandler::class, 'users.list');
    $app->post('/api/users', [
        Middleware\ValidationMiddleware::class,
        Handler\CreateUserHandler::class,
    ], 'users.create');
    $app->get('/api/users/{id:\d+}', Handler\GetUserHandler::class, 'users.get');
    $app->patch('/api/users/{id:\d+}', [
        Middleware\ValidationMiddleware::class,
        Handler\UpdateUserHandler::class,
    ], 'users.update');
    $app->delete('/api/users/{id:\d+}', Handler\DeleteUserHandler::class, 'users.delete');
};
```

## PSR-15 Handler

```php
<?php
// src/App/Handler/ListUsersHandler.php
namespace App\Handler;

use App\Service\UserService;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ListUsersHandler implements RequestHandlerInterface
{
    public function __construct(
        private readonly UserService $service
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $page = (int) ($request->getQueryParams()['page'] ?? 1);
        $perPage = (int) ($request->getQueryParams()['per_page'] ?? 20);

        $result = $this->service->getPaginated($page, $perPage);

        return new JsonResponse([
            'data' => $result['items'],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $result['total'],
            ],
        ]);
    }
}
```

## PSR-15 Middleware

```php
<?php
// src/App/Middleware/ValidationMiddleware.php
namespace App\Middleware;

use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ValidationMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly array $rules = []
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $method = $request->getMethod();
        $path = $request->getUri()->getPath();

        $data = match ($method) {
            'POST', 'PATCH', 'PUT' => $request->getParsedBody(),
            default => $request->getQueryParams(),
        };

        $rules = $this->getRules($method, $path);
        $errors = $this->validate($data, $rules);

        if (!empty($errors)) {
            return new JsonResponse([
                'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Validation failed', 'details' => $errors],
            ], 422);
        }

        return $handler->handle($request);
    }

    private function validate(array $data, array $rules): array
    {
        $errors = [];
        foreach ($rules as $field => $constraints) {
            foreach ($constraints as $constraint) {
                // Simplified validation logic
            }
        }
        return $errors;
    }
}
```

## Programmatic Pipeline

```php
use Mezzio\Middleware\ErrorResponseGenerator;

$app->pipe(ErrorResponseGenerator::class);
$app->pipe(\Mezzio\Helper\ServerUrlMiddleware::class);
$app->pipe(\Mezzio\Helper\UrlHelperMiddleware::class);
$app->pipe(\Mezzio\Router\Middleware\RouteMiddleware::class);
$app->pipe(\Mezzio\Router\Middleware\DispatchMiddleware::class);
$app->pipe(\Mezzio\Router\Middleware\ImplicitHeadMiddleware::class);
$app->pipe(\Mezzio\Router\Middleware\ImplicitOptionsMiddleware::class);
$app->pipe(\Mezzio\Router\Middleware\MethodNotAllowedMiddleware::class);
```

## Testing Mezzio

```php
<?php
namespace AppTest\Handler;

use App\Handler\ListUsersHandler;
use App\Service\UserService;
use Laminas\Diactoros\ServerRequest;
use PHPUnit\Framework\TestCase;

class ListUsersHandlerTest extends TestCase
{
    private ListUsersHandler $handler;
    private UserService $service;

    protected function setUp(): void
    {
        $this->service = $this->createMock(UserService::class);
        $this->handler = new ListUsersHandler($this->service);
    }

    public function testReturnsUsersList(): void
    {
        $this->service->method('getPaginated')
            ->willReturn(['items' => [['id' => 1]], 'total' => 1]);

        $request = new ServerRequest();
        $response = $this->handler->handle($request);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode((string) $response->getBody(), true);
        $this->assertArrayHasKey('data', $data);
    }
}
```
