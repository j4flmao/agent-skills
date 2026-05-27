# Docker Compose and Networking

## Overview
Docker Compose defines multi-container applications using YAML. Docker networking enables container communication across hosts and within a single host. This reference covers compose file structure, networking modes, service discovery, load balancing, and production patterns.

## Docker Compose File Structure

### Basic Compose File
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - api

  api:
    build: ./api
    environment:
      - DB_HOST=db
      - DB_PORT=5432
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Service Dependencies
```yaml
version: '3.8'

services:
  app:
    build: .
    depends_on:
      redis:
        condition: service_started
      db:
        condition: service_healthy
      migrations:
        condition: service_completed_successfully

  migrations:
    build: ./migrations
    profiles:
      - setup

  redis:
    image: redis:7-alpine

  db:
    image: postgres:15
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
```

## Networking Modes

### Bridge Network (Default)
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    networks:
      - frontend
      - backend

  web:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"

  db:
    image: postgres:15
    networks:
      - backend
    # No ports exposed - only accessible within backend network

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

### Host Network
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    network_mode: host
    # Uses host's network stack directly
    # Port mapping is not used with host network
```

### Custom Network Configuration
```yaml
version: '3.8'

services:
  app:
    networks:
      my_network:
        ipv4_address: 172.20.0.10

networks:
  my_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
    driver_opts:
      com.docker.network.bridge.name: br-myapp
```

## Service Discovery

### DNS Resolution
```yaml
version: '3.8'

services:
  api:
    image: myapi:latest
    # Accessible as "api" from other services
    # e.g., http://api:3000

  worker:
    image: myworker:latest
    # Can resolve "api" via Docker's embedded DNS
    environment:
      - API_URL=http://api:3000

  # Aliases for additional hostnames
  redis:
    image: redis:7-alpine
    networks:
      default:
        aliases:
          - cache
          - session-store
```

## Port Mapping

### Port Configuration
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      # HOST:CONTAINER
      - "80:80"
      - "443:443"

      # Random host port
      - "8080"

      # UDP port
      - "53:53/udp"

      # Bind to specific interface
      - "127.0.0.1:3000:3000"

      # Range syntax
      - "8000-8010:8000-8010"
```

## Volumes and Configuration

### Named Volumes
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro

volumes:
  pgdata:
    driver: local
    driver_opts:
      type: none
      device: /data/postgres
      o: bind
```

### Configs and Secrets
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    configs:
      - source: app_config
        target: /etc/app/config.yml
        uid: '1000'
        gid: '1000'
        mode: 0440
    secrets:
      - db_password

configs:
  app_config:
    file: ./config/app.yml

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Extends and Profiles

### Service Extends
```yaml
# base.yml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"

# override.yml
version: '3.8'
services:
  web:
    extends:
      file: base.yml
      service: web
    environment:
      - CUSTOM_VAR=value
```

### Profiles
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest

  db:
    image: postgres:15

  monitoring:
    image: grafana/grafana
    profiles:
      - monitoring

  backup:
    image: mybackup:latest
    profiles:
      - maintenance
      - production

# Start with: docker compose --profile monitoring up
# Start with: docker compose --profile "*" up
```

## Production Considerations

### Resource Limits
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Health Checks
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      db:
        condition: service_healthy
```

## Key Points
- Compose defines multi-container applications with YAML
- Docker DNS provides automatic service discovery by service name
- Bridge networks isolate containers, host network shares host stack
- Network aliases allow additional hostnames for services
- Port mapping controls external access to container ports
- Named volumes persist data across container restarts
- Profiles enable conditional service activation
- Depends_on with conditions controls startup order
- Health checks ensure services are ready before use
- Resource limits prevent containers from consuming all host resources
- Secrets and configs provide secure file management
- Use profiles for development vs production separation
