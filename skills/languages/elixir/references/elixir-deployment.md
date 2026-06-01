# Elixir Deployment Guide

## Release Build

### mix.exs Configuration
```elixir
def project do
  [
    releases: [
      my_app: [
        include_executables_for: [:unix],
        steps: [:assemble, &embed_erts?/1, :tar],
        cookie: System.fetch_env!("RELEASE_COOKIE"),
        vm_args: "rel/vm.args"
      ]
    ]
  ]
end

defp embed_erts?(release) do
  # Embed ERTS for self-contained deployment
  :embed_erts
end
```

### Build Command
```bash
MIX_ENV=prod mix release

# Output:
# _build/prod/rel/my_app/
# ├── bin/
# │   ├── my_app       # Start command
# │   ├── my_app.bat   # Windows
# │   └── my_app_eval  # Run arbitrary code
# ├── lib/
# ├── erts-14.2/
# └── releases/
#     ├── 0.1.0/
#     └── RELEASES
```

## Runtime Configuration

### config/runtime.exs
```elixir
import Config

database_url = System.fetch_env!("DATABASE_URL")
secret_key_base = System.fetch_env!("SECRET_KEY_BASE")

config :my_app, MyApp.Repo,
  url: database_url,
  pool_size: String.to_integer(System.get_env("POOL_SIZE", "10")),
  ssl: System.get_env("DB_SSL", "true") == "true"

config :my_app, MyAppWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))],
  url: [host: System.fetch_env!("HOST")],
  secret_key_base: secret_key_base,
  server: true,
  live_view: [signing_salt: System.fetch_env!("LIVE_VIEW_SALT")]
```

### vm.args
```
# rel/vm.args
+P 262144          # Max processes
+sfwi 500          # Max scheduler busy wait
+K true            # Kernel poll
+sbwt none         # No scheduler busy wait
+swt very_low      # Low scheduler wakeup threshold
-smp auto          # SMP automatically
```

## Docker Deployment

### Multi-stage Dockerfile
```dockerfile
# Build stage
FROM hexpm/elixir:1.17.0-erlang-27.0-debian-bookworm-20230612 AS build

RUN apt-get update -y && apt-get install -y build-essential git && apt-get clean

WORKDIR /app

# Cache deps
COPY mix.exs mix.lock ./
COPY config config/
RUN mix do deps.get, deps.compile

# Compile and build release
COPY lib lib/
COPY priv priv/
RUN MIX_ENV=prod mix compile
RUN MIX_ENV=prod mix release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && apt-get clean

WORKDIR /app
COPY --from=build /app/_build/prod/rel/my_app ./

EXPOSE 4000

CMD ["bin/my_app", "start"]
```

### docker-compose.yml
```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "4000:4000"
    env_file: .env.production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: my_app_prod
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U postgres
      interval: 5s

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

## Kubernetes Deployment

### Deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myregistry/my-app:latest
          ports:
            - containerPort: 4000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: SECRET_KEY_BASE
              valueFrom:
                secretKeyRef:
                  name: app-secret
                  key: secret_key_base
            - name: RELEASE_COOKIE
              valueFrom:
                secretKeyRef:
                  name: app-secret
                  key: release_cookie
            - name: HOST
              value: "app.example.com"
            - name: PORT
              value: "4000"
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 4000
      targetPort: 4000
```

## Migration Strategy

### Release Commands
Define in `lib/my_app/release.ex`:
```elixir
defmodule MyApp.Release do
  @app :my_app

  def migrate do
    load_app()
    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
```

### Deploy Script
```bash
# 1. Build release
MIX_ENV=prod mix release

# 2. Run migrations (before deploying new binary)
bin/my_app eval "MyApp.Release.migrate"

# 3. Deploy new binary
rsync -avz _build/prod/rel/my_app/ user@server:/opt/my_app/

# 4. Restart
/bin/systemctl restart my_app
```

## Monitoring

### Prometheus Metrics
```elixir
# mix.exs
{:prometheus_phoenix, "~> 1.3"},
{:prometheus_ecto, "~> 1.4"},
{:prometheus_ex, "~> 3.2"},
{:prometheus_plugs, "~> 1.1"},

# In endpoint
plug PrometheusPhoenixExporter

# In router
get "/metrics", PrometheusExporterLive
```

### Logging Configuration
```elixir
config :logger,
  level: :info,
  backends: [:console]

config :logger, :console,
  format: "$time [$level] $metadata$message\n",
  metadata: [:request_id, :user_id, :session_id]
```

### Distributed Tracing
```elixir
# mix.exs
{:opentelemetry, "~> 1.3"},
{:opentelemetry_exporter, "~> 1.6"},
{:opentelemetry_phoenix, "~> 1.1"},
{:opentelemetry_ecto, "~> 1.1"},
{:opentelemetry_oban, "~> 0.3"},

# config.exs
config :opentelemetry, :processors, [
  {OpenTelemetry.SpanProcessor.Batch,
   %{exporter: {:opentelemetry_exporter, %{endpoints: ["http://otel-collector:4318"]}}}}
]
```
