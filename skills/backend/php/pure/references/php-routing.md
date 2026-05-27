# Pure PHP Routing

## Router Implementation

### Simple Router
```php
<?php

declare(strict_types=1);

namespace App\Routing;

class Router
{
    private array $routes = [];
    private array $middleware = [];

    public function get(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    public function group(array $attributes, callable $callback): void
    {
        $previousPrefix = $this->prefix ?? '';
        $this->prefix = ($previousPrefix ? $previousPrefix . '/' : '') . ($attributes['prefix'] ?? '');

        if (isset($attributes['middleware'])) {
            $this->middleware = array_merge($this->middleware, (array) $attributes['middleware']);
        }

        $callback($this);

        $this->prefix = $previousPrefix;
    }

    private function addRoute(string $method, string $path, callable|array $handler, array $middleware): void
    {
        $this->routes[] = [
            'method' => $method,
            'path' => ($this->prefix ?? '') . '/' . trim($path, '/'),
            'handler' => $handler,
            'middleware' => array_merge($this->middleware, $middleware),
        ];
    }

    public function dispatch(string $method, string $uri): mixed
    {
        $uri = '/' . trim(parse_url($uri, PHP_URL_PATH), '/');

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->matchRoute($route['path'], $uri);
            if ($params !== false) {
                return $this->handle($route, $params);
            }
        }

        throw new HttpException(404, 'Route not found: ' . $method . ' ' . $uri);
    }

    private function matchRoute(string $pattern, string $uri): array|false
    {
        $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $uri, $matches)) {
            return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        }

        return false;
    }

    private function handle(array $route, array $params): mixed
    {
        $handler = $route['handler'];
        $request = new Request($params);

        $pipeline = array_merge($route['middleware'], [$handler]);

        $pipelineFn = function (Request $request) use (&$pipelineFn, &$pipeline) {
            $next = array_shift($pipeline);

            if (is_array($next)) {
                [$class, $method] = $next;
                $instance = new $class();
                return $instance->$method($request, $pipelineFn);
            }

            return $next($request);
        };

        return $pipelineFn($request);
    }
}
```

## Middleware System

### Middleware Interface
```php
<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Http\Request;
use Closure;

interface MiddlewareInterface
{
    public function handle(Request $request, Closure $next): mixed;
}
```

### Auth Middleware
```php
<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Http\Request;
use App\Services\AuthService;
use Closure;

class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly AuthService $auth) {}

    public function handle(Request $request, Closure $next): mixed
    {
        $token = $request->header('Authorization');

        if (!$token || !str_starts_with($token, 'Bearer ')) {
            throw new HttpException(401, 'Missing or invalid authorization header');
        }

        $token = substr($token, 7);
        $user = $this->auth->validateToken($token);

        if (!$user) {
            throw new HttpException(401, 'Invalid or expired token');
        }

        $request->setUser($user);
        return $next($request);
    }
}
```

### CORS Middleware
```php
<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Http\Request;
use Closure;

class CorsMiddleware implements MiddlewareInterface
{
    private array $allowedOrigins = ['https://app.example.com'];
    private array $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    private array $allowedHeaders = ['Content-Type', 'Authorization'];

    public function handle(Request $request, Closure $next): mixed
    {
        if ($request->method() === 'OPTIONS') {
            header('Access-Control-Allow-Origin: ' . $this->getOrigin($request));
            header('Access-Control-Allow-Methods: ' . implode(', ', $this->allowedMethods));
            header('Access-Control-Allow-Headers: ' . implode(', ', $this->allowedHeaders));
            header('Access-Control-Max-Age: 3600');
            return '';
        }

        $response = $next($request);
        header('Access-Control-Allow-Origin: ' . $this->getOrigin($request));

        return $response;
    }

    private function getOrigin(Request $request): string
    {
        $origin = $request->header('Origin') ?? '*';

        if (in_array($origin, $this->allowedOrigins)) {
            return $origin;
        }

        return $this->allowedOrigins[0] ?? '*';
    }
}
```

### Rate Limiting Middleware
```php
<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Http\Request;
use Closure;

class RateLimitMiddleware implements MiddlewareInterface
{
    private array $limits = [];

    public function __construct(
        private int $maxRequests = 100,
        private int $windowSeconds = 60,
    ) {}

    public function handle(Request $request, Closure $next): mixed
    {
        $key = $request->ip() ?? 'unknown';

        if (!isset($this->limits[$key])) {
            $this->limits[$key] = ['count' => 0, 'reset' => time() + $this->windowSeconds];
        }

        $limit = &$this->limits[$key];

        if (time() > $limit['reset']) {
            $limit = ['count' => 0, 'reset' => time() + $this->windowSeconds];
        }

        $limit['count']++;

        header('X-RateLimit-Limit: ' . $this->maxRequests);
        header('X-RateLimit-Remaining: ' . max(0, $this->maxRequests - $limit['count']));
        header('X-RateLimit-Reset: ' . $limit['reset']);

        if ($limit['count'] > $this->maxRequests) {
            throw new HttpException(429, 'Rate limit exceeded. Try again in ' . ($limit['reset'] - time()) . ' seconds.');
        }

        return $next($request);
    }
}
```

## Entry Point

### Front Controller
```php
<?php
// public/index.php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Routing\Router;
use App\Middleware\AuthMiddleware;
use App\Middleware\CorsMiddleware;
use App\Middleware\RateLimitMiddleware;

$router = new Router();

$router->group(['middleware' => [CorsMiddleware::class, RateLimitMiddleware::class]], function (Router $router) {
    // Public routes
    $router->post('/auth/login', [AuthController::class, 'login']);
    $router->post('/auth/register', [AuthController::class, 'register']);

    // Protected routes
    $router->group(['middleware' => [AuthMiddleware::class]], function (Router $router) {
        $router->get('/users', [UserController::class, 'index']);
        $router->get('/users/{id}', [UserController::class, 'show']);
        $router->post('/users', [UserController::class, 'store']);
        $router->put('/users/{id}', [UserController::class, 'update']);
        $router->delete('/users/{id}', [UserController::class, 'delete']);
    });
});

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    $response = $router->dispatch($method, $uri);

    if (is_array($response) || is_object($response)) {
        header('Content-Type: application/json');
        echo json_encode($response);
    } else {
        echo $response;
    }
} catch (HttpException $e) {
    http_response_code($e->getCode());
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Internal server error']);
    error_log($e->getMessage());
}
```

## Key Points
- Custom router supports path parameters with named placeholders {id}
- Middleware pipeline processes requests before the handler
- Middleware can be applied globally, per group, or per route
- Auth middleware validates tokens and injects user into request
- CORS middleware handles preflight options requests
- Rate limiting middleware tracks per-IP usage
- Front controller pattern routes all requests through index.php
- Exception handling at the entry point catches all HTTP and server errors
- Group routing with prefix and shared middleware reduces duplication
