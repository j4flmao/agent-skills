# Docker Compose in Production

Docker Compose can run production workloads with proper configuration for health, resource management, security, and logging.

## Health Checks

Every service needs a health check for orchestration:

```yaml
services:
  api:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
```

## Resource Limits

```yaml
services:
  api:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

  worker:
    image: myapp-worker:latest
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Restart Policies

```yaml
services:
  api:
    restart: always
    deploy:
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
        window: 120s

  batch-job:
    restart: "no"
    deploy:
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 5
```

## Logging Driver

```yaml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        compress: "true"
        tag: "{{.Name}}/{{.ID}}"

  nginx:
    logging:
      driver: gelf
      options:
        gelf-address: "udp://graylog:12201"
        tag: "nginx-prod"

  app:
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-retries: "2"
        loki-batch-size: "400"
```

## Secrets Management

```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    external: true
  tls_cert:
    file: ./secrets/cert.pem

services:
  api:
    secrets:
      - db_password
      - api_key
      - tls_cert
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - API_KEY_FILE=/run/secrets/api_key
```

## Configs

```yaml
configs:
  nginx_config:
    file: ./nginx.conf
  app_config:
    file: ./config.prod.yaml

services:
  nginx:
    configs:
      - source: nginx_config
        target: /etc/nginx/conf.d/default.conf
  api:
    configs:
      - source: app_config
        target: /app/config.yaml
```

## Networks

```yaml
networks:
  frontend:
    driver: overlay
    attachable: true
    ipam:
      config:
        - subnet: 10.0.1.0/24
  backend:
    driver: overlay
    internal: true  # no external access
    ipam:
      config:
        - subnet: 10.0.2.0/24

services:
  nginx:
    networks:
      - frontend
  api:
    networks:
      - frontend
      - backend
  db:
    networks:
      - backend
```

## Full Production Example

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    deploy:
      placement:
        constraints: [node.role == manager]
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  app:
    image: myapp:${TAG:-latest}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      mode: replicated
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 5
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 10s
        order: stop-first
    secrets:
      - source: db_password
        uid: "2000"
        mode: 0440
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - REDIS_HOST=redis
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      placement:
        constraints: [node.role == worker]

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
    driver: rexray
    driver_opts:
      size: "50"
  redis_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay
    internal: true
```

Production Compose files require attention to resource boundaries, health-based dependencies, secure secret injection, and proper log management.
