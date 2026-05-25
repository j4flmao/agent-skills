# Zend to Laminas Migration

## Why Migrate

| Reason | Detail |
|--------|--------|
| End of life | ZF3 no longer maintained |
| Security | No security patches after 2022 |
| Modern PHP | Laminas supports PHP 8.1+ |
| PSR compliance | Laminas fully PSR-7, PSR-11, PSR-15 |
| Composer | Namespace change only, same APIs |

## Namespace Migration

| Zend Namespace | Laminas Namespace |
|----------------|-------------------|
| `Zend\Mvc` | `Laminas\Mvc` |
| `Zend\ServiceManager` | `Laminas\ServiceManager` |
| `Zend\Db` | `Laminas\Db` |
| `Zend\Router` | `Laminas\Router` |
| `Zend\Form` | `Laminas\Form` |
| `Zend\InputFilter` | `Laminas\InputFilter` |
| `Zend\View` | `Laminas\View` |
| `Zend\Validator` | `Laminas\Validator` |

## Automated Migration

```bash
# Install migration tool
composer require laminas/laminas-migration --dev

# Dry run
vendor/bin/laminas-migration migrate -d module/

# Execute migration
vendor/bin/laminas-migration migrate -i module/

# Rewrite composer.json
vendor/bin/laminas-migration composer-from-config
```

## Manual Migration Steps

### 1. Update composer.json

```json
{
  "require": {
    "php": "^8.1",
    "laminas/laminas-mvc": "^3.6",
    "laminas/laminas-servicemanager": "^3.21",
    "laminas/laminas-router": "^3.11",
    "laminas/laminas-db": "^2.16",
    "laminas/laminas-form": "^3.3",
    "laminas/laminas-view": "^2.27",
    "laminas/laminas-log": "^2.16"
  },
  "autoload": {
    "psr-4": {
      "Application\\": "module/Application/src/"
    }
  }
}
```

### 2. Update Module.php

```php
// Before (Zend)
namespace Application;

use Zend\Mvc\MvcEvent;
use Zend\ModuleManager\Feature\ConfigProviderInterface;

// After (Laminas)
namespace Application;

use Laminas\Mvc\MvcEvent;
use Laminas\ModuleManager\Feature\ConfigProviderInterface;

class Module implements ConfigProviderInterface
{
    public function getConfig(): array
    {
        return include __DIR__ . '/../config/module.config.php';
    }

    public function onBootstrap(MvcEvent $e): void
    {
        $em = $e->getApplication()->getEventManager();
        $em->attach(MvcEvent::EVENT_DISPATCH_ERROR, [$this, 'onDispatchError']);
    }
}
```

### 3. Update module.config.php

```php
// Before
use Zend\Router\Http\Segment;
use Zend\ServiceManager\Factory\InvokableFactory;

// After
use Laminas\Router\Http\Segment;
use Laminas\ServiceManager\Factory\InvokableFactory;

return [
    'service_manager' => [
        'factories' => [
            Model\UserTable::class => Model\UserTableFactory::class,
            Service\UserService::class => Service\UserServiceFactory::class,
        ],
    ],
    'controllers' => [
        'factories' => [
            Controller\UserController::class => Controller\UserControllerFactory::class,
        ],
    ],
];
```

### 4. Update Controllers

```php
// Before
use Zend\Mvc\Controller\AbstractActionController;
use Zend\View\Model\ViewModel;
use Zend\View\Model\JsonModel;

// After
use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;

class UserController extends AbstractActionController
{
    public function __construct(private readonly UserService $service) {}

    public function listAction()
    {
        return new JsonModel(['data' => $this->service->getAll()]);
    }
}
```

### 5. Update Module.config.php

```php
return [
    'module_listener_options' => [
        'module_paths' => [
            './module',
            './vendor',
        ],
        'config_glob_paths' => [
            sprintf('config/autoload/{,*.}{global,local}.php', APPLICATION_ENV),
        ],
    ],
];
```

## ServiceManager Changes

```php
// Before
use Zend\ServiceManager\Factory\FactoryInterface;

// After
use Laminas\ServiceManager\Factory\FactoryInterface;

class UserServiceFactory implements FactoryInterface
{
    public function __invoke(ContainerInterface $container, $requestedName, ?array $options = null): UserService
    {
        return new UserService(
            $container->get(Model\UserTable::class),
        );
    }
}
```

## Testing Migration

```php
// Before
use Zend\Test\PHPUnit\Controller\AbstractHttpControllerTestCase;

// After
use Laminas\Test\PHPUnit\Controller\AbstractHttpControllerTestCase;

class UserControllerTest extends AbstractHttpControllerTestCase
{
    protected function setUp(): void
    {
        $this->setApplicationConfig(include 'config/application.config.php');
        parent::setUp();
    }
}
```

## Migration Checklist

| Step | Status |
|------|--------|
| Update composer.json dependencies to laminas |
| Search/replace `Zend\` → `Laminas\` in all PHP files |
| Update config files (`Zend\` → `Laminas\`) |
| Update view helpers (Zend\View → Laminas\View) |
| Run laminas-migration tool for automated pass |
| Run composer update |
| Run test suite |
| Verify all routes work |
| Check ServiceManager config |
| Update any third-party ZF3 modules |
