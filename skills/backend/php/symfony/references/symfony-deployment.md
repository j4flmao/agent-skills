# Symfony Deployment

## Production Build

```bash
# Install production dependencies only
composer install --no-dev --optimize-autoloader

# Warm cache
php bin/console cache:warmup --env=prod

# Dump assets
php bin/console assets:install --env=prod

# Build assets (if using Webpack Encore)
npm run build
```

## Docker Deployment

```dockerfile
FROM php:8.3-fpm-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git unzip postgresql-dev && \
    docker-php-ext-install pdo_pgsql opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.* ./
RUN composer install --no-dev --optimize-autoloader --no-interaction
COPY . .
RUN php bin/console cache:warmup --env=prod

FROM php:8.3-fpm-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-dev && \
    docker-php-ext-install pdo_pgsql opcache
COPY --from=builder /app /app
COPY --from=builder /usr/bin/composer /usr/bin/composer
RUN php bin/console cache:warmup --env=prod

HEALTHCHECK --interval=30s --timeout=3s \
    CMD php bin/console doctrine:query:sql "SELECT 1" || exit 1
```

```yaml
# docker-compose.yml
services:
  php:
    build: .
    volumes:
      - caddy_data:/data
    environment:
      APP_ENV: prod
      DATABASE_URL: postgresql://user:pass@db:5432/app
      APP_SECRET: ${APP_SECRET}

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - php

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: ${DB_PASS}

volumes:
  caddy_data:
```

## Environment Configuration

```yaml
# .env.prod
APP_ENV=prod
APP_SECRET=
DATABASE_URL=postgresql://user:pass@localhost:5432/app
MESSENGER_TRANSPORT_DSN=doctrine://default
MAILER_DSN=smtp://user:pass@smtp.example.com:587
```

## Platform Deployments

| Platform | Method | Notes |
|----------|--------|-------|
| **Platform.sh** | Git deploy | Native Symfony support |
| **AWS ECS** | Docker | Fargate with RDS |
| **Heroku** | Git deploy | Procfile, heroku.yml |
| **Kubernetes** | Helm | PHP-FPM + Nginx |
| **Fortrabbit** | Git deploy | Symfony-optimized |
| **Cloudways** | Managed | PHP-FPM, auto-scaling |
| **VPS (DigitalOcean)** | Docker | Manual setup |

## Caching Strategy

```yaml
# config/packages/cache.yaml
framework:
    cache:
        app: cache.adapter.redis
        default_redis_provider: 'redis://localhost:6379'
        pools:
            order.cache:
                adapter: cache.app
                default_lifetime: 3600
```

## Queue Workers

```yaml
# supervisor.conf
[program:messenger-consume]
command=php /app/bin/console messenger:consume async --time-limit=3600
user=www-data
numprocs=4
process_name=%(program_name)s_%(process_num)02d
autostart=true
autorestart=true
```

## Health Checks

```php
// src/Controller/HealthController.php
#[Route('/health', methods: ['GET'])]
public function health(Connection $conn): JsonResponse
{
    try {
        $conn->executeQuery('SELECT 1');
        return $this->json(['status' => 'healthy']);
    } catch (\Exception $e) {
        return $this->json(['status' => 'unhealthy'], 503);
    }
}
```

## Performance Tuning

```ini
; php.ini production settings
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.revalidate_freq=60
realpath_cache_size=4096K
realpath_cache_ttl=600
```

```yaml
# config/packages/prod/framework.yaml
framework:
    http_cache: true
    fragments: { path: /_fragment }
```
