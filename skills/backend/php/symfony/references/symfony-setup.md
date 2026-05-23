# Symfony Setup Guide

## Prerequisites
- PHP 8.1+
- Composer 2.5+
- Symfony CLI (`symfony`)

## Project Initialization
```bash
# Create project with full stack
symfony new order-service --webapp

# Create minimal project
symfony new order-service --no-webapp

# Add packages
composer require api-platform/core
composer require doctrine/orm
composer require doctrine/doctrine-migrations-bundle
composer require symfony/messenger
composer require symfony/serializer-pack
composer require symfony/validator
composer require --dev maker-bundle
composer require --dev debug-bundle
composer require --dev test-pack
```

## Symfony Flex
```bash
# Flex automatically configures packages via recipes
composer config extra.symfony.allow-contrib true
composer require symfony/orm-pack      # auto-configures Doctrine
composer require symfony/mailer        # auto-configures mailer
```

## Directory Structure
```
order-service/
├── src/
│   ├── Controller/
│   ├── Entity/
│   ├── Repository/
│   ├── Service/
│   ├── Message/
│   ├── EventSubscriber/
│   └── DataFixtures/
├── config/
│   ├── packages/
│   │   ├── doctrine.yaml
│   │   ├── messenger.yaml
│   │   └── framework.yaml
│   ├── routes/
│   │   └── api.yaml
│   └── services.yaml
├── migrations/
├── templates/
├── public/
│   └── index.php
├── .env
└── composer.json
```

## Environment Configuration
```yaml
# .env (local)
DATABASE_URL="postgresql://app:secret@127.0.0.1:5432/orders?serverVersion=15"
MESSENGER_TRANSPORT_DSN="redis://localhost:6379/messages"
APP_SECRET=your-secret-here

# .env.prod
DATABASE_URL="postgresql://user:pass@prod-db:5432/orders"
```

## Key Configuration Files
```yaml
# config/packages/doctrine.yaml
doctrine:
  dbal:
    url: '%env(resolve:DATABASE_URL)%'
  orm:
    auto_generate_proxy_classes: true
    naming_strategy: doctrine.orm.naming_strategy.underscore_number_aware
    auto_mapping: true
    mappings:
      App:
        is_bundle: false
        dir: '%kernel.project_dir%/src/Entity'
        prefix: 'App\Entity'
        alias: App

# config/services.yaml
services:
  _defaults:
    autowire: true
    autoconfigure: true
  App\:
    resource: '../src/'
    exclude:
      - '../src/DependencyInjection/'
      - '../src/Entity/'
      - '../src/Kernel.php'
```

## Maker Commands
```bash
php bin/console make:controller OrderController
php bin/console make:entity Order
php bin/console make:command App:SeedOrders
php bin/console make:subscriber OrderSubscriber
php bin/console make:validator OrderConstraints
php bin/console make:form OrderType
```

## Development Server
```bash
# Symfony CLI
symfony server:start

# Built-in PHP server
php -S localhost:8000 -t public/

# With HTTPS
symfony server:start --no-tls=false
```

## Debugging
```bash
# Web Debug Toolbar (auto-enabled in dev)
# Profiler
php bin/console debug:router
php bin/console debug:container OrderService
php bin/console debug:autowiring

# Logs
tail -f var/log/dev.log
```
