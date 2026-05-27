# Laminas Authentication and Authorization

## Authentication Adapters

### Database Authentication
```php
<?php

declare(strict_types=1);

namespace App\Auth;

use Laminas\Authentication\Adapter\DbTable\CallbackCheck;
use Laminas\Authentication\AuthenticationService;
use Laminas\Authentication\Storage\Session;
use Laminas\Db\Adapter\Adapter as DbAdapter;

class AuthService
{
    private AuthenticationService $authService;
    private DbAdapter $dbAdapter;

    public function __construct(DbAdapter $dbAdapter)
    {
        $this->dbAdapter = $dbAdapter;
        $this->authService = new AuthenticationService(new Session());
    }

    public function authenticate(string $email, string $password): array
    {
        $adapter = new CallbackCheck(
            $this->dbAdapter,
            'users',
            'email',
            'password',
            function ($hash, $password) {
                return password_verify($password, $hash);
            },
        );

        $adapter->setIdentity($email);
        $adapter->setCredential($password);

        $result = $this->authService->authenticate($adapter);

        if (!$result->isValid()) {
            return [
                'success' => false,
                'message' => 'Invalid email or password',
            ];
        }

        return [
            'success' => true,
            'identity' => $result->getIdentity(),
        ];
    }

    public function hasIdentity(): bool
    {
        return $this->authService->hasIdentity();
    }

    public function getIdentity(): mixed
    {
        return $this->authService->getIdentity();
    }

    public function clearIdentity(): void
    {
        $this->authService->clearIdentity();
    }
}
```

## RBAC Authorization

### Role-Based Access Control
```php
<?php

declare(strict_types=1);

namespace App\Auth;

use Laminas\Permissions\Rbac\Rbac;
use Laminas\Permissions\Rbac\Role;

class RbacService
{
    private Rbac $rbac;

    public function __construct()
    {
        $this->rbac = new Rbac();
        $this->initializeRoles();
    }

    private function initializeRoles(): void
    {
        // Guest role
        $guest = new Role('guest');
        $guest->addPermission('read.public');
        $this->rbac->addRole($guest);

        // User role (inherits guest)
        $user = new Role('user');
        $user->addPermission('read.profile');
        $user->addPermission('update.profile');
        $user->addPermission('create.order');
        $user->addPermission('read.order');
        $this->rbac->addRole($user, $guest);

        // Editor role (inherits user)
        $editor = new Role('editor');
        $editor->addPermission('create.product');
        $editor->addPermission('update.product');
        $editor->addPermission('delete.product');
        $this->rbac->addRole($editor, $user);

        // Admin role (inherits editor)
        $admin = new Role('admin');
        $admin->addPermission('manage.users');
        $admin->addPermission('manage.settings');
        $admin->addPermission('delete.order');
        $this->rbac->addRole($admin, $editor);

        // Super admin (inherits admin, has all permissions)
        $superAdmin = new Role('super-admin');
        $this->rbac->addRole($superAdmin, $admin);
    }

    public function isGranted(string $role, string $permission): bool
    {
        if (!$this->rbac->hasRole($role)) {
            return false;
        }

        return $this->rbac->isGranted($role, $permission);
    }
}
```

### RBAC Guard Middleware (Mezzio)
```php
<?php

declare(strict_types=1);

namespace App\Auth;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\RedirectResponse;

class AuthorizationMiddleware implements MiddlewareInterface
{
    private array $routePermissions;

    public function __construct(
        private readonly RbacService $rbac,
        private readonly SessionService $session,
        array $routePermissions = [],
    ) {
        $this->routePermissions = $routePermissions;
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $routeName = $request->getAttribute('route_name');
        $userRole = $this->session->getUserRole();

        if (!$userRole) {
            return new RedirectResponse('/login');
        }

        $requiredPermission = $this->routePermissions[$routeName] ?? null;

        if ($requiredPermission && !$this->rbac->isGranted($userRole, $requiredPermission)) {
            return new RedirectResponse('/unauthorized');
        }

        return $handler->handle($request);
    }
}
```

## ACL Authorization

### ACL Configuration
```php
<?php

declare(strict_types=1);

namespace App\Auth;

use Laminas\Permissions\Acl\Acl;
use Laminas\Permissions\Acl\Role\GenericRole;
use Laminas\Permissions\Acl\Resource\GenericResource;

class AclService
{
    private Acl $acl;

    public function __construct()
    {
        $this->acl = new Acl();
        $this->initialize();
    }

    private function initialize(): void
    {
        // Roles
        $this->acl->addRole(new GenericRole('guest'));
        $this->acl->addRole(new GenericRole('user'), 'guest');
        $this->acl->addRole(new GenericRole('editor'), 'user');
        $this->acl->addRole(new GenericRole('admin'), 'editor');

        // Resources
        $this->acl->addResource(new GenericResource('public'));
        $this->acl->addResource(new GenericResource('profile'));
        $this->acl->addResource(new GenericResource('orders'));
        $this->acl->addResource(new GenericResource('products'));
        $this->acl->addResource(new GenericResource('users'));
        $this->acl->addResource(new GenericResource('settings'));

        // Permissions
        $this->acl->deny(null, null); // Default deny all

        // Guest
        $this->acl->allow('guest', 'public', ['read']);

        // User
        $this->acl->allow('user', 'profile', ['read', 'update']);
        $this->acl->allow('user', 'orders', ['create', 'read']);

        // Editor
        $this->acl->allow('editor', 'products', ['create', 'read', 'update']);
        $this->acl->deny('editor', 'products', ['delete']);

        // Admin
        $this->acl->allow('admin', 'products', ['delete']);
        $this->acl->allow('admin', 'users', ['create', 'read', 'update', 'delete']);
        $this->acl->allow('admin', 'settings', ['read', 'update']);
    }

    public function isAllowed(string $role, string $resource, string $privilege): bool
    {
        return $this->acl->isAllowed($role, new GenericResource($resource), $privilege);
    }

    public function assertRoute(string $role, string $route): bool
    {
        $routeConfig = $this->getRouteConfig($route);

        if (!$routeConfig) {
            return true; // Public route
        }

        return $this->isAllowed(
            $role,
            $routeConfig['resource'],
            $routeConfig['privilege'],
        );
    }

    private function getRouteConfig(string $route): ?array
    {
        $routes = [
            'profile' => ['resource' => 'profile', 'privilege' => 'read'],
            'profile.edit' => ['resource' => 'profile', 'privilege' => 'update'],
            'order.create' => ['resource' => 'orders', 'privilege' => 'create'],
            'admin.users' => ['resource' => 'users', 'privilege' => 'read'],
            'admin.settings' => ['resource' => 'settings', 'privilege' => 'update'],
        ];

        return $routes[$route] ?? null;
    }
}
```

## JWT Authentication

### JWT Adapter
```php
<?php

declare(strict_types=1);

namespace App\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtAuth
{
    private string $algorithm = 'HS256';

    public function __construct(
        private readonly string $secretKey,
        private readonly int $tokenTtl = 3600,
    ) {}

    public function createToken(array $payload): string
    {
        $issuedAt = time();
        $payload['iat'] = $issuedAt;
        $payload['exp'] = $issuedAt + $this->tokenTtl;

        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }

    public function validateToken(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            return (array) $decoded;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function createRefreshToken(string $userId): string
    {
        $payload = [
            'sub' => $userId,
            'type' => 'refresh',
            'iat' => time(),
            'exp' => time() + 86400 * 30, // 30 days
        ];

        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }

    public function refreshAccessToken(string $refreshToken): ?array
    {
        $payload = $this->validateToken($refreshToken);

        if (!$payload || ($payload['type'] ?? null) !== 'refresh') {
            return null;
        }

        return [
            'access_token' => $this->createToken([
                'sub' => $payload['sub'],
                'role' => $payload['role'] ?? 'user',
            ]),
            'expires_in' => $this->tokenTtl,
        ];
    }
}
```

## Session Management

### Session Service
```php
<?php

declare(strict_types=1);

namespace App\Auth;

use Laminas\Session\Container as SessionContainer;
use Laminas\Session\SessionManager;

class SessionService
{
    private SessionContainer $session;

    public function __construct()
    {
        $manager = new SessionManager();
        $manager->start();
        $this->session = new SessionContainer('auth');
    }

    public function setUser(array $user): void
    {
        $this->session->user_id = $user['id'];
        $this->session->email = $user['email'];
        $this->session->role = $user['role'];
        $this->session->logged_in = true;
        $this->session->last_activity = time();
    }

    public function getUser(): ?array
    {
        if (!$this->session->logged_in) {
            return null;
        }

        return [
            'id' => $this->session->user_id,
            'email' => $this->session->email,
            'role' => $this->session->role,
        ];
    }

    public function getUserRole(): ?string
    {
        return $this->session->role ?? null;
    }

    public function isLoggedIn(): bool
    {
        return (bool) ($this->session->logged_in ?? false);
    }

    public function clear(): void
    {
        $this->session->exchangeArray([]);
    }

    public function isSessionExpired(int $maxLifetime = 3600): bool
    {
        $lastActivity = $this->session->last_activity ?? 0;
        return (time() - $lastActivity) > $maxLifetime;
    }

    public function refreshActivity(): void
    {
        $this->session->last_activity = time();
    }
}
```

## Key Points
- Database authentication adapter verifies email/password against users table
- RBAC implements role hierarchy with permission inheritance
- ACL provides fine-grained resource and privilege control
- Authorization middleware intercepts requests and checks permissions
- JWT tokens provide stateless authentication with refresh token rotation
- Session management with configurable lifetime and activity tracking
- Roles inherit permissions from parent roles (guest → user → editor → admin)
- Permission checks return boolean for simple if/else logic
- Route-based authorization maps routes to required permissions
- Middleware-based guards integrate with Mezzio PSR-15 pipeline
