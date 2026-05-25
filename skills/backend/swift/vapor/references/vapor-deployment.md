# Vapor Deployment

## Docker

```dockerfile
FROM swift:6.0-jammy as build
WORKDIR /app
COPY Package.swift Package.resolved ./
RUN swift package resolve
COPY . .
RUN swift build -c release --static-swift-stdlib

FROM ubuntu:jammy
WORKDIR /app
COPY --from=build /app/.build/release/Run .
COPY --from=build /usr/lib/x86_64-linux-gnu/libssl* /usr/lib/x86_64-linux-gnu/
COPY --from=build /usr/lib/x86_64-linux-gnu/libcrypto* /usr/lib/x86_64-linux-gnu/
EXPOSE 8080
ENTRYPOINT ["./Run"]
CMD ["serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "8080"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/orders
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: orders
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

## Environment Configuration

```swift
// configure.swift
public func configure(_ app: Application) throws {
    guard let dbUrl = Environment.get("DATABASE_URL") else {
        fatalError("DATABASE_URL not set")
    }

    app.databases.use(.postgres(
        url: dbUrl,
        maxConnectionsPerEventLoop: 2
    ), as: .psql)

    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = 8080
}

// .env.production
DATABASE_URL=postgres://user:pass@db:5432/orders
LOG_LEVEL=info
```

## Process Manager (systemd)

```ini
[Unit]
Description=Vapor Order Service
After=network.target

[Service]
Type=simple
User=vapor
WorkingDirectory=/opt/orders
ExecStart=/opt/orders/.build/release/Run serve --env production
Restart=always
RestartSec=5
EnvironmentFile=/opt/orders/.env.production

[Install]
WantedBy=multi-user.target
```

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 90;
    }
}
```

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: swift-actions/setup-swift@v2
        with:
          swift-version: "6.0"
      - run: swift test --enable-code-coverage
      - run: docker build -t orders:${{ github.sha }} .
      - run: docker push orders:${{ github.sha }}
```

## Vapor Cloud

```yaml
# vapor.yml
id: orders-service
name: Orders API
environments:
  production:
    region: eu-west
    build:
      swift_version: "6.0"
    run:
      command: serve --port 8080
      scale:
        min: 2
        max: 10
```

## Performance Tuning

```swift
// Maximum body size
app.routes.defaultMaxBodySize = "10mb"

// Client timeout
app.http.client.configuration.timeout = .seconds(30)

// Number of event loop groups
app.http.server.configuration.backlog = 256
```
