# Laminas MVC Reference

## Module System

```
module/
├── User/
│   ├── config/module.config.php    # Routes, services, controllers, view
│   ├── src/
│   │   └── Module.php              # Module class with bootstrap
│   └── view/
│       └── user/
│           └── index.phtml
```

### Module.php Methods
```php
class Module
{
    public function getConfig(): array;                 // Module config
    public function onBootstrap(MvcEvent $e): void;     // Bootstrap events
    public function getAutoloaderConfig(): array;        // PSR-4 config
    public function getServiceConfig(): array;           // ServiceManager config
    public function getControllerConfig(): array;        // Controller config
    public function getConsoleUsage(): array;            // Console routes
}
```

## EventManager

### MVC Events (Ordered)
```php
MvcEvent::EVENT_BOOTSTRAP          // Module bootstrap
MvcEvent::EVENT_ROUTE              // Route matching
MvcEvent::EVENT_DISPATCH           // Controller dispatch
MvcEvent::EVENT_RENDER             // View rendering
MvcEvent::EVENT_FINISH             // Response send

EVENT_BOOTSTRAP => 1
EVENT_ROUTE      => 2
EVENT_DISPATCH   => 3
EVENT_RENDER     => 4
EVENT_FINISH     => 5

// Error events
MvcEvent::EVENT_DISPATCH_ERROR
MvcEvent::EVENT_RENDER_ERROR
```

### Custom Events
```php
use Laminas\EventManager\Event;

// Trigger
$events = $this->getEventManager();
$events->trigger('user.created', $this, ['user' => $user]);

// Listen (in Module::onBootstrap)
$shared = $e->getApplication()->getEventManager()->getSharedManager();
$shared->attach('User\Service\UserService', 'user.created', function ($event) {
    $user = $event->getParam('user');
    // send email, log, etc.
});
```

## Controller Plugins
```php
$this->redirect()->toRoute('user', ['action' => 'index']);
$this->url()->fromRoute('user', ['id' => 1]);
$this->params('id');
$this->params()->fromQuery('page', 1);
$this->params()->fromPost('email');
$this->layout('layout/admin');
$this->getResponse();
$this->getRequest();
$this->flashMessenger()->addSuccessMessage('Saved!');
$this->identity();  // current authenticated user
```

## Console Routes
```php
// module.config.php
'console' => [
    'router' => [
        'routes' => [
            'sync-users' => [
                'type' => 'simple',
                'options' => [
                    'route' => 'sync users [--force]',
                    'defaults' => [
                        'controller' => Controller\ConsoleController::class,
                        'action' => 'sync',
                    ],
                ],
            ],
        ],
    ],
];
```

## Navigation
```php
// module/Application/config/navigation.php
return [
    'default' => [
        [
            'label' => 'Home',
            'route' => 'home',
        ],
        [
            'label' => 'Users',
            'route' => 'user',
            'pages' => [
                ['label' => 'Add', 'route' => 'user', 'params' => ['action' => 'add']],
            ],
        ],
    ],
];

// View
<?= $this->navigation('default')->menu()->setPartial('partials/nav.phtml') ?>
```

## Translate / i18n
```php
// module.config.php
'translator' => [
    'locale' => 'en_US',
    'translation_file_patterns' => [
        [
            'type' => 'gettext',
            'base_dir' => __DIR__ . '/../language',
            'pattern' => '%s.mo',
        ],
    ],
];

echo $this->translate('Hello World');
echo $this->translate('Hello World', 'custom_domain', 'de_DE');
```

## View Helpers
```php
$this->escapeHtml($string);       // Escape HTML
$this->escapeHtmlAttr($string);   // Escape HTML attribute
$this->escapeJs($string);         // Escape JavaScript
$this->escapeUrl($string);        // Escape URL
$this->basePath('/css/app.css'); // Base URL
$this->headTitle('Users');       // Page title
$this->headMeta()->appendName('keywords', 'user management');
$this->headLink()->appendStylesheet($this->basePath('/css/app.css'));
$this->headScript()->appendFile($this->basePath('/js/app.js'));
$this->inlineScript()->appendScript('alert("hi");');
$this->partial('partials/header', ['title' => 'Users']);
$this->gravatar($email, ['size' => 80]);
```
