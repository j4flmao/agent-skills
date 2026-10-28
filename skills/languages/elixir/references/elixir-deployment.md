# Elixir Deployment Guide: Releases, Docker, Kubernetes, Clustering

Production Elixir ships as a **Mix release**: a self-contained directory with compiled BEAM files, the Erlang runtime (ERTS) and start scripts. No Mix or source code is needed on the target. Phoenix apps can generate the Dockerfile and release helpers with `mix phx.gen.release --docker`.

## Release Configuration

```elixir
# mix.exs
def project do
  [
    app: :my_app,
    version: "0.1.0",
    elixir: "~> 1.17",
    start_permanent: Mix.env() == :prod,
    releases: [
      my_app: [
        include_executables_for: [:unix],
        include_erts: true,          # default; ships ERTS so the host needs no Erlang
        steps: [:assemble, :tar],    # :tar also produces my_app-0.1.0.tar.gz
        strip_beams: true
      ]
    ]
  ]
end
```

| Option | Default | Notes |
|--------|---------|-------|
| `include_erts` | `true` | Build host and target must share OS, libc and CPU arch |
| `include_executables_for` | `[:unix, :windows]` | Restrict to platforms you deploy to |
| `steps` | `[:assemble]` | Add `:tar` for an archive; custom steps are functions `release -> release` |
| `cookie` | random, stored in `releases/COOKIE` | Override at runtime with `RELEASE_COOKIE`; never read secrets in `mix.exs` (compile time) |

```bash
MIX_ENV=prod mix assets.deploy   # Phoenix: build + digest static assets
MIX_ENV=prod mix release

_build/prod/rel/my_app/bin/my_app start        # foreground
_build/prod/rel/my_app/bin/my_app daemon       # background (unix)
_build/prod/rel/my_app/bin/my_app remote       # attach IEx to running node
_build/prod/rel/my_app/bin/my_app eval "MyApp.Release.migrate()"
_build/prod/rel/my_app/bin/my_app rpc "IO.inspect(node())"
```

Generate editable templates with `mix release.init`: `rel/env.sh.eex`, `rel/vm.args.eex`, `rel/remote.vm.args.eex`.

## Runtime Configuration

`config/runtime.exs` runs on every boot, after the release is built. Read all secrets and environment-specific values there.

```elixir
import Config

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise "environment variable DATABASE_URL is missing"

  config :my_app, MyApp.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    ssl: System.get_env("DB_SSL", "true") == "true"

  config :my_app, MyAppWeb.Endpoint,
    url: [host: System.fetch_env!("PHX_HOST"), port: 443, scheme: "https"],
    http: [ip: {0, 0, 0, 0, 0, 0, 0, 0}, port: String.to_integer(System.get_env("PORT") || "4000")],
    secret_key_base: System.fetch_env!("SECRET_KEY_BASE"),
    server: true
end
```

Generate `SECRET_KEY_BASE` with `mix phx.gen.secret`. `config/prod.exs` is compile-time: put only static values there.

## VM Arguments

`rel/vm.args.eex` holds emulator flags. Keep it minimal; defaults are good for most apps.

```text
## Max processes (default 1_048_576 on 64-bit)
+P 2000000
## Enable time warp so the VM tracks OS clock changes safely
+C multi_time_warp
## Fail fast instead of swapping when the node runs out of memory
## (set limits in the container instead of tuning allocators blindly)
```

Do not copy legacy flags such as `+K true` (kernel poll is always on since OTP 21) or `-smp auto` (SMP is the only mode). Change scheduler busy-wait (`+sbwt`) only after measuring CPU usage in containers with CPU limits.

## Docker (Multi-stage)

```dockerfile
ARG ELIXIR_VERSION=1.17.3
ARG OTP_VERSION=27.1.2
ARG DEBIAN_VERSION=bookworm-20241016-slim
ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} AS build
RUN apt-get update -y && apt-get install -y build-essential git && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV MIX_ENV=prod
RUN mix local.hex --force && mix local.rebar --force

COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

COPY priv priv
COPY lib lib
COPY assets assets
RUN mix assets.deploy
RUN mix compile
COPY config/runtime.exs config/
RUN mix release

FROM ${RUNNER_IMAGE}
RUN apt-get update -y && apt-get install -y libstdc++6 openssl libncurses6 locales ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 MIX_ENV=prod
WORKDIR /app
RUN chown nobody /app
COPY --from=build --chown=nobody:root /app/_build/prod/rel/my_app ./
USER nobody
CMD ["/app/bin/server"]
```

Pin exact image tags that exist on Docker Hub (`hexpm/elixir` tags combine Elixir, OTP and OS versions). `bin/server` is created by `mix phx.gen.release` and sets `PHX_SERVER=true`.

### Compose for local production parity

```yaml
services:
  app:
    build: .
    ports: ["4000:4000"]
    env_file: .env.production
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: my_app_prod
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
volumes:
  postgres_data:
```

The top-level `version:` key is obsolete in the Compose Specification; omit it.

## Migrations

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

  defp repos, do: Application.fetch_env!(@app, :ecto_repos)
  defp load_app, do: Application.ensure_loaded(@app)
end
```

Run `bin/migrate` (generated) or `bin/my_app eval "MyApp.Release.migrate()"` as a Kubernetes Job or pre-deploy hook, once per deploy, not in every pod's start command. Keep migrations backward compatible (expand, deploy, contract) so old and new pods can run during a rolling update.

## Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels: {app: my-app}
  template:
    metadata:
      labels: {app: my-app}
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: my-app
          image: registry.example.com/my-app:1.4.2   # immutable tag, not :latest
          ports: [{containerPort: 4000}]
          env:
            - name: POD_IP
              valueFrom: {fieldRef: {fieldPath: status.podIP}}
            - name: RELEASE_DISTRIBUTION
              value: name
            - name: RELEASE_NODE
              value: my_app@$(POD_IP)
            - name: RELEASE_COOKIE
              valueFrom: {secretKeyRef: {name: app-secret, key: release_cookie}}
            - name: SECRET_KEY_BASE
              valueFrom: {secretKeyRef: {name: app-secret, key: secret_key_base}}
            - name: DATABASE_URL
              valueFrom: {secretKeyRef: {name: db-secret, key: url}}
            - name: PHX_HOST
              value: app.example.com
          readinessProbe:
            httpGet: {path: /health/ready, port: 4000}
            periodSeconds: 5
          livenessProbe:
            httpGet: {path: /health/live, port: 4000}
            initialDelaySeconds: 20
            periodSeconds: 10
          resources:
            requests: {cpu: 500m, memory: 512Mi}
            limits: {memory: 1Gi}
```

### Clustering with libcluster

```elixir
# config/runtime.exs
config :libcluster,
  topologies: [
    k8s: [
      strategy: Cluster.Strategy.Kubernetes.DNS,
      config: [service: "my-app-headless", application_name: "my_app"]
    ]
  ]
```

Requires a headless Service (`clusterIP: None`) and the same `RELEASE_COOKIE` on every pod. Restrict EPMD (4369) and distribution ports with a NetworkPolicy: Erlang distribution is unauthenticated beyond the cookie and unencrypted unless TLS distribution (`-proto_dist inet_tls`) is configured.

## Observability

```elixir
# Logger (Elixir 1.15+ uses Erlang :logger handlers; :backends is deprecated)
config :logger, :default_handler, level: :info
config :logger, :default_formatter,
  format: "$time [$level] $metadata$message\n",
  metadata: [:request_id, :trace_id]
```

Metrics: Phoenix emits `:telemetry` events; define them in `MyAppWeb.Telemetry` and export with `telemetry_metrics_prometheus` or PromEx.

```elixir
# OpenTelemetry deps: :opentelemetry, :opentelemetry_api, :opentelemetry_exporter,
# :opentelemetry_phoenix, :opentelemetry_ecto, :opentelemetry_bandit (if using Bandit)
config :opentelemetry, span_processor: :batch, traces_exporter: :otlp
config :opentelemetry_exporter,
  otlp_protocol: :http_protobuf,
  otlp_endpoint: System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318")
```

Call `OpentelemetryPhoenix.setup()` and `OpentelemetryEcto.setup([:my_app, :repo])` in `Application.start/2`.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Secrets read in `config/prod.exs` or `mix.exs` | Move to `config/runtime.exs` |
| Release built on macOS, run on Linux | Build inside the same base image as the runner |
| Migrations run by every pod | Single Job or pre-deploy hook |
| `:latest` image tag | Immutable version or digest |
| Hot code upgrades attempted with plain releases | Use rolling deploys; appups need extra tooling and discipline |
| Distribution port exposed publicly | NetworkPolicy / firewall, TLS distribution for untrusted networks |

## Checklist

- [ ] `mix release` builds in CI from a pinned builder image
- [ ] All secrets come from `runtime.exs` via env vars or a secret manager
- [ ] Migrations are backward compatible and run once per deploy
- [ ] Readiness and liveness probes hit distinct, cheap endpoints
- [ ] `RELEASE_COOKIE` is shared via a Secret; distribution ports are firewalled
- [ ] Logs are structured; telemetry exported to metrics and traces
