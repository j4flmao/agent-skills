---
name: php-zend
description: >
  Use this skill when the user says 'Zend', 'Laminas', 'Zend Framework',
  'Laminas MVC', 'laminas-servicemanager', 'laminas-db', 'laminas-form',
  'laminas-inputfilter', 'laminas-router', 'laminas-view', 'laminas-module',
  'Mezzio', 'laminas-stratigility', 'API Platform', 'Doctrine ORM',
  'Zend Framework 3', 'ZF3', 'Zend Expressive'.
  Covers: Laminas MVC project structure, Module system, ServiceManager DI,
  routing, controllers, database (laminas-db + Doctrine), forms, validation,
  views, Mezzio middleware, API development, security, testing.
  Do NOT use this for: Laravel (use php-laravel), plain PHP (use php-pure),
  or Symfony-specific questions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, php, zend, laminas, phase-7]
---

# Zend / Laminas

## Purpose
Build enterprise PHP applications with Laminas (formerly Zend Framework). Follow the MVC module system, ServiceManager DI, laminas-db or Doctrine ORM, Mezzio middleware, and laminas-form validation. Maintain backward compatibility with ZF3 patterns.

## Agent Protocol

### Trigger
Exact user phrases: "Zend", "Zend Framework", "Laminas", "Laminas MVC", "Mezzio", "laminas-servicemanager", "laminas-db", "laminas-form", "laminas-inputfilter", "laminas-router", "laminas-module", "ZF3", "Zend Expressive", "Doctrine ORM", "laminas-stratigility", "API Platform".

### Input Context
- Framework version (Laminas 3.x, Mezzio 4.x, ZF3 migration).
- PHP version (8.1+ required for Laminas 3).
- Database (MySQL, PostgreSQL with laminas-db or Doctrine).
- MVC vs Middleware (Laminas MVC vs Mezzio).
- Existing modules and their dependencies.

### Output Artifact
PHP files, module configuration, ServiceManager factories, routes. No extraneous explanation.

### Response Format
PHP code only. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Module structure with Module.php, config, src, tests.
- [ ] ServiceManager configuration (factories, invokables, aliases).
- [ ] Routes defined with controllers or middleware.
- [ ] Database access via laminas-db TableGateway or Doctrine entities.
- [ ] Forms with InputFilter validation.
- [ ] View templates or JSON responses.
- [ ] Event listeners for modular extension.

### Max Response Length
Direct file output. No response text.

## Project Structure

```
project/
├── module/
│   ├── Application/
│   │   ├── config/
│   │   │   ├── module.config.php      # Routes, controllers, view_manager
│   │   │   └── navigation.php
│   │   ├── src/
│   │   │   ├── Controller/
│   │   │   │   ├── IndexController.php
│   │   │   │   └── UserController.php
│   │   │   ├── Service/
│   │   │   │   └── UserService.php
│   │   │   └── Module.php
│   │   └── view/
│   │       └── application/
│   │           └── index/
│   │               └── index.phtml
│   ├── User/
│   │   ├── config/
│   │   │   └── module.config.php
│   │   ├── src/
│   │   │   ├── Controller/
│   │   │   ├── Model/
│   │   │   │   ├── User.php
│   │   │   │   ├── UserTable.php       # TableGateway
│   │   │   │   └── UserRepository.php  # Doctrine
│   │   │   ├── Form/
│   │   │   │   └── UserForm.php
│   │   │   ├── InputFilter/
│   │   │   │   └── UserFilter.php
│   │   │   └── Module.php
│   │   └── view/
│   │       └── user/
│   │           ├── index.phtml
│   │           └── form.phtml
│   └── Api/
│       ├── config/
│       │   └── module.config.php
│       └── src/
│           ├── Controller/
│           │   └── UserApiController.php
│           └── Module.php
├── config/
│   ├── application.config.php
│   ├── modules.config.php
│   └── autoload/
│       ├── global.php
│       └── local.php.dist
├── public/
│   └── index.php
├── data/
│   ├── cache/
│   └── log/
├── test/
│   └── UserTest/
│       └── Controller/
│           └── UserControllerTest.php
├── composer.json
└── phpunit.xml
```

## Module Configuration

```php
<?php
// module/User/config/module.config.php
namespace User;

use Laminas\Router\Http\Segment;
use Laminas\ServiceManager\Factory\InvokableFactory;

return [
    'service_manager' => [
        'factories' => [
            Model\UserTable::class => Model\UserTableFactory::class,
            Service\UserService::class => Service\UserServiceFactory::class,
        ],
        'aliases' => [
            'UserService' => Service\UserService::class,
        ],
        'shared' => [
            Model\UserTable::class => false, // new instance each time
        ],
    ],
    'controllers' => [
        'factories' => [
            Controller\UserController::class => Controller\UserControllerFactory::class,
        ],
    ],
    'router' => [
        'routes' => [
            'user' => [
                'type' => Segment::class,
                'options' => [
                    'route' => '/user[/:action[/:id]]',
                    'defaults' => [
                        'controller' => Controller\UserController::class,
                        'action' => 'index',
                    ],
                ],
            ],
            'user-api' => [
                'type' => Segment::class,
                'options' => [
                    'route' => '/api/users[/:id]',
                    'defaults' => [
                        'controller' => Controller\Api\UserController::class,
                    ],
                    'constraints' => [
                        'id' => '[0-9]+',
                    ],
                ],
            ],
        ],
    ],
    'view_manager' => [
        'template_path_stack' => [__DIR__ . '/../view'],
    ],
];
```

## Module Class

```php
<?php
// module/User/src/Module.php
namespace User;

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
        $app = $e->getApplication();
        $em = $app->getEventManager();
        $em->attach(MvcEvent::EVENT_DISPATCH_ERROR, [$this, 'onDispatchError']);
    }

    public function onDispatchError(MvcEvent $e): void
    {
        $exception = $e->getParam('exception');
        if ($exception instanceof \RuntimeException) {
            $response = $e->getResponse();
            $response->setStatusCode(500);
        }
    }
}
```

## ServiceManager (DI)

### Factory
```php
<?php
namespace User\Service;

use Laminas\ServiceManager\Factory\FactoryInterface;
use Psr\Container\ContainerInterface;

class UserServiceFactory implements FactoryInterface
{
    public function __invoke(ContainerInterface $container, $requestedName, ?array $options = null): UserService
    {
        return new UserService(
            $container->get(Model\UserTable::class),
            $container->get('Logger')
        );
    }
}
```

### Service Class
```php
<?php
namespace User\Service;

use User\Model\UserTable;

class UserService
{
    public function __construct(
        private readonly UserTable $table,
        private readonly \Laminas\Log\Logger $logger
    ) {}

    public function getAll(): array
    {
        $this->logger->info('Fetching all users');
        return $this->table->fetchAll();
    }

    public function getById(int $id): ?array
    {
        return $this->table->getById($id);
    }

    public function create(array $data): int
    {
        $this->logger->info('Creating user');
        return $this->table->insert($data);
    }
}
```

## Controller

```php
<?php
namespace User\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;
use User\Service\UserService;

class UserController extends AbstractActionController
{
    public function __construct(
        private readonly UserService $service
    ) {}

    public function indexAction()
    {
        return new ViewModel([
            'users' => $this->service->getAll(),
        ]);
    }

    public function detailAction()
    {
        $id = (int) $this->params('id');
        $user = $this->service->getById($id);

        if (!$user) {
            $this->getResponse()->setStatusCode(404);
            return;
        }

        return new ViewModel(['user' => $user]);
    }
}

// API Controller (JSON response)
class UserApiController extends AbstractActionController
{
    public function __construct(private readonly UserService $service) {}

    public function listAction()
    {
        return new JsonModel(['data' => $this->service->getAll()]);
    }

    public function getAction()
    {
        $id = (int) $this->params('id');
        $user = $this->service->getById($id);
        if (!$user) {
            $this->getResponse()->setStatusCode(404);
            return new JsonModel(['error' => 'Not found']);
        }
        return new JsonModel(['data' => $user]);
    }
}
```

## Database (TableGateway)

```php
<?php
namespace User\Model;

use Laminas\Db\TableGateway\TableGatewayInterface;
use Laminas\Db\Sql\Select;

class UserTable
{
    public function __construct(
        private readonly TableGatewayInterface $tableGateway
    ) {}

    public function fetchAll(): array
    {
        return $this->tableGateway->select()->toArray();
    }

    public function getById(int $id): ?array
    {
        $rowset = $this->tableGateway->select(['id' => $id]);
        $row = $rowset->current();
        return $row ? (array) $row : null;
    }

    public function insert(array $data): int
    {
        $this->tableGateway->insert($data);
        return (int) $this->tableGateway->getLastInsertValue();
    }

    public function update(int $id, array $data): void
    {
        $this->tableGateway->update($data, ['id' => $id]);
    }

    public function delete(int $id): void
    {
        $this->tableGateway->delete(['id' => $id]);
    }

    public function findByEmail(string $email): ?array
    {
        $rowset = $this->tableGateway->select(['email' => $email]);
        return ($row = $rowset->current()) ? (array) $row : null;
    }
}

// Factory
class UserTableFactory
{
    public function __invoke(ContainerInterface $container): UserTable
    {
        $db = $container->get(\Laminas\Db\Adapter\AdapterInterface::class);
        $tableGateway = new \Laminas\Db\TableGateway\TableGateway('users', $db);
        return new UserTable($tableGateway);
    }
}
```

## Forms & Validation

```php
<?php
namespace User\Form;

use Laminas\Form\Form;
use Laminas\Form\Element;
use Laminas\InputFilter\InputFilterProviderInterface;

class UserForm extends Form implements InputFilterProviderInterface
{
    public function __construct()
    {
        parent::__construct('user');
        $this->setAttribute('method', 'POST');

        $this->add([
            'name' => 'name',
            'type' => Element\Text::class,
            'options' => ['label' => 'Name'],
            'attributes' => ['required' => true, 'maxlength' => 255],
        ]);
        $this->add([
            'name' => 'email',
            'type' => Element\Email::class,
            'options' => ['label' => 'Email'],
            'attributes' => ['required' => true],
        ]);
        $this->add([
            'name' => 'submit',
            'type' => Element\Submit::class,
            'attributes' => ['value' => 'Save'],
        ]);
    }

    public function getInputFilterSpecification(): array
    {
        return [
            'name' => [
                'required' => true,
                'filters' => [['name' => 'StringTrim']],
                'validators' => [
                    ['name' => 'StringLength', 'options' => ['min' => 2, 'max' => 255]],
                ],
            ],
            'email' => [
                'required' => true,
                'validators' => [
                    ['name' => 'EmailAddress'],
                    ['name' => 'Db\NoRecordExists', 'options' => [
                        'table' => 'users',
                        'field' => 'email',
                    ]],
                ],
            ],
        ];
    }
}
```

## View Template

```php
<?php
// module/User/view/user/index/index.phtml
/** @var \Laminas\View\Renderer\PhpRenderer $this */
$this->headTitle('Users');
?>

<h1>Users</h1>

<table class="table">
    <thead>
        <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($this->users as $user): ?>
        <tr>
            <td><?= $this->escapeHtml($user['id']) ?></td>
            <td><?= $this->escapeHtml($user['name']) ?></td>
            <td><?= $this->escapeHtml($user['email']) ?></td>
            <td>
                <a href="<?= $this->url('user', ['action' => 'detail', 'id' => $user['id']]) ?>">
                    View
                </a>
            </td>
        </tr>
        <?php endforeach ?>
    </tbody>
</table>
```

## Mezzio (Middleware)

```php
// config/routes.php
use Mezzio\Router\RouterInterface;
use Psr\Container\ContainerInterface;

return function (RouterInterface $router, ContainerInterface $container) {
    $router->get('/api/users', [
        \Mezzio\Middleware\AuthenticationMiddleware::class,
        \App\Handler\ListUsersHandler::class,
    ], 'users.list');

    $router->post('/api/users', [
        \Mezzio\Middleware\AuthenticationMiddleware::class,
        \App\Handler\CreateUserHandler::class,
    ], 'users.create');

    $router->get('/api/users/{id:\d+}', [
        \Mezzio\Middleware\AuthenticationMiddleware::class,
        \App\Handler\GetUserHandler::class,
    ], 'users.get');
};
```

```php
<?php
// App/Handler/ListUsersHandler.php
namespace App\Handler;

use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ListUsersHandler implements RequestHandlerInterface
{
    public function __construct(
        private readonly \App\Service\UserService $service
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $users = $this->service->getAll();
        return new JsonResponse(['data' => $users]);
    }
}
```

## Rules
- Every module has its own `Module.php`, `config/`, `src/`, and `view/`.
- ServiceManager factories for all injectable classes — never `new` inside controllers.
- Use `TableGateway` for simple CRUD, Doctrine for complex domain models.
- Forms always paired with InputFilter for validation.
- Controllers are thin — business logic in Service classes.
- Use `Laminas\Log` or PSR-3 (Monolog) for logging.
- Return `ViewModel` for HTML, `JsonModel` for API responses.
- Use `Zend\` namespaces for ZF3 migration; `Laminas\` for new projects.
- Mezzio routing uses PSR-7/PSR-15 middleware; Laminas MVC uses MVC controllers.

## References
- `references/laminas-mvc.md` — Module system, EventManager, plugins, console routes
- `references/laminas-db-doctrine.md` — laminas-db TableGateway, Doctrine ORM, migrations
- `references/mezzio-api.md` — Mezzio middleware, PSR-15 handlers, API development
- `references/zend-migration.md` — Migration from ZF3 to Laminas, namespace changes, checklist

## Handoff
Next skill: php-laravel — if user prefers Laravel's opinionated conventions.
Carry forward: PHP version, database driver, module structure, laminas vs zend namespace.
