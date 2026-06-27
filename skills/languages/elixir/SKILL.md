---
name: elixir
description: >
  Use this skill when the user asks about Elixir build tools, Mix, OTP,
  Phoenix, Ecto, supervision trees, concurrency, testing, or production
  deployment. Focus on BEAM/Erlang VM, tooling, and ecosystem — not syntax.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [elixir, language, build, beam, phoenix]
---

# Elixir

## Purpose
Guide for Elixir build tools (Mix), OTP supervision trees, Phoenix framework, Ecto database layer, concurrency patterns, testing, and production deployment on BEAM.

## Agent Protocol

### Trigger
Keywords: `elixir build`, `mix`, `phoenix`, `ecto`, `otp`, `supervision tree`, `gen server`, `phoenix liveview`, `nerves`, `ex_unit`, `elixir release`.

### Input Context
- Project type (Phoenix web app, OTP app, Nerves firmware, CLI tool)
- Database (PostgreSQL via Ecto, ETS, Mnesia)
- Deployment target (bare-metal, Docker, Fly.io, Gigalixir)

## Decision Trees

### Project Type Selection
```
What are you building?
├── Web app with real-time features → Phoenix (LiveView, PubSub, Channels)
├── Real-time API / WebSocket server → Phoenix Channels or simply GenServer + WebSock
├── Background job processor → Oban (persistent, PostgreSQL-backed jobs)
├── CLI tool → Mix escript.build (self-contained binary) or Burrito
├── Firmware / IoT → Nerves (Raspberry Pi, BeagleBone, embedded Linux)
└── Distributed system → OTP with :global / Horde / Swarm for node discovery
```

### Data Store Selection
```
Data access pattern?
├── Relational, complex queries → Ecto + PostgreSQL (Phoenix standard)
├── In-memory, fast lookups → ETS (:ets, DETS for disk)
├── Process-local state → Agent, GenServer state
├── Distributed, replicated → Mnesia (built-in, eventually consistent)
├── Time-series → ClickHouse via Ecto adapter or Postgres + TimescaleDB
└── Caching → Cachex (ETS-based with TTL, stats, and distributed mode)
```

### Supervision Strategy
```
Failure tolerance needed?
├── Simple app, no state → DynamicSupervisor (children started on demand)
├── Stateful service → GenServer under Supervisor with restart: :transient
├── Distributed → Horde.DynamicSupervisor (distributed across cluster nodes)
├── One-for-one restarts → Supervisor with strategy: :one_for_one
├── All-or-nothing → Supervisor with strategy: :one_for_all
└── Don't restart on failure → rest_for_one (restart siblings, not itself)
```

## Build & Dependency Management

### mix.exs
```elixir
defmodule MyApp.MixProject do
  use Mix.Project

  def project do
    [
      app: :my_app,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: [
        my_app: [
          include_executables_for: [:unix],
          steps: [:assemble, &embed_erts?/1, :tar]
        ]
      ]
    ]
  end

  def application do
    [mod: {MyApp.Application, []}, extra_applications: [:logger]]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_live_view, "~> 0.20"},
      {:ecto_sql, "~> 3.11"},
      {:postgrex, "~> 0.17"},
      {:oban, "~> 2.17"},
      {:jason, "~> 1.4"},
      {:bandit, "~> 1.5"}  # HTTP/2 server (replaces cowboy)
    ]
  end
end
```

### Common Commands
```bash
mix new my_app              # New OTP app
mix phx.new my_app          # New Phoenix app (--no-ecto, --no-html, --live)
mix deps.get                # Fetch dependencies
mix deps.compile            # Compile deps
mix compile --warnings-as-errors
mix format                  # Formatter (enforce in CI)
mix dialyzer                # Success typing analysis (run regularly)
mix test                    # Run tests
mix release                 # Build production release
mix escript.build           # Build CLI escript
```

## Language-Specific Patterns

### GenServer (Server Process)
```elixir
defmodule OrderServer do
  use GenServer

  # Client API
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def get_order(id) do
    GenServer.call(__MODULE__, {:get_order, id})
  end

  def create_order(attrs) do
    GenServer.cast(__MODULE__, {:create_order, attrs})
  end

  # Server Callbacks
  @impl true
  def init(_opts) do
    {:ok, %{orders: %{}, counter: 0}}
  end

  @impl true
  def handle_call({:get_order, id}, _from, state) do
    {:reply, Map.get(state.orders, id), state}
  end

  @impl true
  def handle_cast({:create_order, attrs}, state) do
    id = state.counter + 1
    order = Map.put(attrs, :id, id)
    {:noreply, put_in(state.orders[id], order)}
  end
end
```

### Phoenix LiveView
```elixir
defmodule MyAppWeb.OrderLive.Index do
  use MyAppWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket), do: Orders.subscribe()  # PubSub on connect
    {:ok, stream(socket, :orders, Orders.list_orders())}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  @impl true
  def handle_info({:order_created, order}, socket) do
    {:noreply, stream_insert(socket, :orders, order)}
  end

  @impl true
  def handle_event("delete", %{"id" => id}, socket) do
    Orders.delete_order(id)
    {:noreply, socket}
  end
end
```

### Ecto Query Patterns
```elixir
defmodule MyApp.Orders do
  import Ecto.Query

  def list_active_orders do
    Repo.all(from o in Order,
      where: o.status != :cancelled,
      order_by: [desc: o.inserted_at],
      limit: 50,
      preload: [:customer, :items]
    )
  end

  def search_orders(criteria) do
    Order
    |> filter_by_status(criteria[:status])
    |> filter_by_date_range(criteria[:from], criteria[:to])
    |> search_by_customer(criteria[:q])
    |> Repo.all()
  end

  defp filter_by_status(query, nil), do: query
  defp filter_by_status(query, status) do
    where(query, status: ^status)
  end

  defp filter_by_date_range(query, nil, nil), do: query
  defp filter_by_date_range(query, from, to) do
    where(query, inserted_at: ^from..^to)
  end
end
```

### Oban Job Pattern
```elixir
defmodule MyApp.ProcessOrderWorker do
  use Oban.Worker, queue: :orders, max_attempts: 3

  @impl true
  def perform(%Oban.Job{args: %{"order_id" => order_id}}) do
    with {:ok, order} <- Orders.get(order_id),
         :ok <- PaymentService.charge(order),
         :ok <- EmailService.send_confirmation(order) do
      :ok
    else
      {:error, :insufficient_funds} -> {:cancel, :no_retry_needed}
      {:error, reason} -> {:error, reason}  # Retry with backoff
    end
  end
end
```

## Testing & Tooling

### ExUnit Patterns
```elixir
defmodule MyApp.OrdersTest do
  use MyApp.DataCase, async: true

  describe "create_order/1" do
    test "creates order with valid attrs" do
      attrs = %{customer_id: 1, total: Decimal.new("50.00")}
      assert {:ok, %Order{status: :pending}} = Orders.create_order(attrs)
    end

    test "rejects empty items" do
      attrs = %{customer_id: 1, items: []}
      assert {:error, changeset} = Orders.create_order(attrs)
      assert "must have at least one item" in errors_on(changeset)[:items]
    end
  end

  describe "list_orders/0" do
    test "returns all orders" do
      order = insert(:order)  # Using ExMachina factory
      assert Orders.list_orders() == [order]
    end
  end
end
```

### Tooling
```bash
# Type checking (Dialyzer)
mix dialyzer --format github  # CI-friendly output

# Code quality
mix credo --strict            # Linter
mix sobelow                  # Phoenix security linter
mix format --check-formatted # CI check

# Profiling
mix run -e "MyModule.bench()" --profile time  # Erlang profiler
:eprof.start()                                 # Per-function timing
```

## Anti-Patterns
- **Process per request**: BEAM can handle millions, but spawning per request is wasteful. Use Task.async for I/O, not GenServer
- **GenServer state as database**: State lost on crash unless persisted. Use Ecto for durable storage, GenServer for cache
- **`Enum.reduce` over streams for large collections**: Intermediate lists consume memory. Use `Stream` for lazy evaluation
- **`IO.inspect` left in production**: Compiles into production. Use `Logger` with levels: `Logger.debug(inspect(data))`
- **N+1 in Ecto**: `Repo.all(Post)` then `post.comments` per post. Use preload in queries: `from p in Post, preload: :comments`
- **Over-engineering supervision trees**: Start simple (one top-level supervisor), add as needed
- **`:infinity` timeout in GenServer call**: Blocks the calling process indefinitely. Always set a timeout
- **`send_after` without cancel**: Timer process survives after GenServer crash. Use `Process.send_after` with reference check
- **Phoenix Context coupling**: Layer-2 context calling layer-3 context = dependency mess. Context should only call its own Repo
- **Not using `@impl`**: Makes refactoring dangerous — compiler won't warn about removed GenServer callbacks

## Performance Patterns
- Use `Task.async_stream` for parallel I/O operations (rate-limit with `max_concurrency`)
- ETS over GenServer for read-heavy, rarely-changed data (no process bottleneck)
- `flatten`/`uniq` over recursive list operations for large datasets
- String concatenation: use `IO.iodata_to_binary/1` or `~s/#{a}#{b}#{c}` over `a <> b <> c`
- Phoenix LiveView uses `stream`/`stream_insert` for 10x+ list diffing performance (Phoenix 1.7+)
- `Process.sleep(0)` yields time slice — not a busy-wait pattern
- Profile with `:eprof` (time) or `:perf` (allocations) before optimizing — BEAM is usually fast enough
- Use `:persistent_term` for configuration that never changes at runtime (fastest lookup)

## Phoenix Context vs. Ecto Schema Organization

Phoenix 1.7+ encourages organizing code by domain context, not architectural layers. Each context (Accounts, Orders, Billing) gets its own module that owns its Repo queries and schema. Schemas define the Ecto mapping but should NOT contain business logic. Contexts expose a public API that controllers and LiveViews call. Anti-pattern: "God context" that imports every schema. Instead, split into focused contexts with clear boundaries. Cross-context calls go through the public API, not through shared Ecto queries. Example: `Orders.create_order(customer)` calls `Accounts.get_customer!(id)` internally, not a shared `Repo.get(Customer, id)`. Keep contexts testable by injecting Repo as a dependency in tests.

## Ecto Migration & Database Versioning

Elixir deployments must handle database migrations carefully. Pattern: (a) run migrations BEFORE deploying new code (not simultaneously), (b) write backward-compatible migrations that don't break running old code, (c) use a separate migration step in CI/CD before the release step. Migration safety: (1) adding a column with a default is safe — old code ignores it, (2) removing a column: deploy code change (stop using column) FIRST, THEN remove column in next release, (3) renaming a column: add new column -> dual-write -> migrate data -> deploy code (read new) -> remove old column, (4) creating a table: always safe — deploy first. Use Ecto.Migrator for runtime migration in production: `Ecto.Migrator.run(Repo, "priv/repo/migrations", :up, all: true)`.

## Observability with Telemetry

Elixir's Telemetry library provides metrics and instrumentation. Each library (Phoenix, Ecto, Oban) emits Telemetry events: `[:phoenix, :endpoint, :start]`, `[:ecto, :query, :total]`, `[:oban, :job, :start]`. Attach handlers for (a) metrics aggregation (Prometheus via Telemetry.Metrics), (b) structured logging (via Logger.metadata), (c) distributed tracing (OpenTelemetry via :opentelemetry_elixir). Common metrics: HTTP request duration (histogram), DB query count/duration per request, LiveView mount time, Oban job duration and failure rate, VM metrics (memory, processes, reductions). Export via `prometheus_ecto`, `prometheus_phoenix`, or custom TelemetryMetricsPrometheus for a `/metrics` endpoint scraped by Prometheus.

## Elixir Release & Deployment

Production releases are built with `mix release`. The release bundles the Erlang VM, all compiled BEAM files, and the runtime config into a self-contained directory. Steps: (1) set `start_permanent: true` in `mix.exs` for `:prod` env, (2) configure releases in mix.exs with `include_executables_for: [:unix]`, (3) build with `MIX_ENV=prod mix release`, (4) copy the `_build/prod/rel/my_app/` directory to the server, (5) run `bin/my_app start`, (6) run `bin/my_app eval "MyApp.Release.migrate"` to run migrations. Docker: use a multi-stage build: builder stage installs Elixir+Erlang, fetches deps, compiles, builds release. Runtime stage uses a minimal image (debian-slim or distroless), copies the release, runs with `bin/my_app start`. Gigalixir: `gigalixir deploy` builds and deploys. Fly.io: `fly deploy` with release command for migrations.

## ETS as First-Class Cache

ETS (Erlang Term Storage) is built into the BEAM and provides in-memory key-value storage without process bottlenecks. Use cases: (a) read-heavy, rarely-changed reference data (country lists, config), (b) session cache (user sessions, rate limit counters), (c) in-memory lookup tables for denormalized data. ETS table types: `:set` (unique keys), `:ordered_set` (sorted iteration), `:bag` (duplicate keys), `:duplicate_bag`. Access: `:ets.lookup/2`, `:ets.insert/2`, `:ets.delete/2`. Heir: set a heir process that inherits the table if the owner crashes. ETS is NOT durable — data is lost on restart. For persistence, pair with Ecto. Performance: ETS read is ~1µs, write is ~3µs — significantly faster than GenServer calls which require message passing. Use `:ets` over GenServer for pure data lookups with no side effects.

## Production Decision Trees

```
Deployment environment?
├── Bare metal / VPS → mix release + systemd unit
│   Config: environment variables, secret files
│   Monitoring: Prometheus + Grafana + Loki
├── Docker / Kubernetes → Multi-stage Dockerfile
│   Config: environment variables + config provider
│   Orchestration: K8s Deployment with readiness/liveness probes
└── Platform-as-a-Service → Gigalixir / Fly.io / Render
    Config: runtime config in dashboard
    Migrations: separate release command step
```

```
Database connection pool pressure?
├── Connections < 20, fine → Default pool size (10-20)
├── Connections 20-50, latency OK → Increase pool_size up to 50
├── Connections > 50, latency issues → Add PGBouncer / transaction pooling
└── Read replicas available → Use Repo replica configuration for reads
    config :my_app, MyApp.Repo, pool_size: 20,
      migration_lock: nil,
      prepare: :unnamed,
      queue_target: 50,
      queue_interval: 1000
```

## Code Examples — HTTP Client with Retry
```elixir
defmodule MyApp.HttpClient do
  @retry_delays [100, 200, 500, 1000, 2000]

  def get(url, opts \\ []) do
    request(:get, url, opts)
  end

  defp request(method, url, opts) do
    retry_delays = opts[:retry_delays] || @retry_delays

    Enum.reduce_while(retry_delays ++ [nil], :error, fn delay, _acc ->
      case req(method, url, opts) do
        {:ok, result} -> {:halt, {:ok, result}}
        {:error, reason} when delay != nil ->
          :timer.sleep(delay)
          {:cont, {:error, reason}}
        {:error, reason} ->
          {:halt, {:error, reason}}
      end
    end)
  end

  defp req(method, url, opts) do
    headers = Keyword.get(opts, :headers, [])
    case :hackney.request(method, url, headers, "", [recv_timeout: 5000]) do
      {:ok, 200, _headers, body} ->
        {:ok, Jason.decode!(body)}
      {:ok, status, _, body} ->
        {:error, {:http_error, status, body}}
      {:error, reason} ->
        {:error, reason}
    end
  end
end
```

### Testing Strategy Decision Tree
```
What are you testing?
├── Unit (pure functions, module logic) → ExUnit with `async: true`
│   Fast, no DB, no side effects
│   Test: validation, business rules, data transformation
├── Context (business logic with Ecto) → DataCase with sandbox DB
│   `async: true` — Ecto sandbox isolates per test
│   Use `insert(:order)` factory (ExMachina) for test data
├── Web (controllers, views, LiveView) → ConnCase or Phoenix.ConnTest
│   Test: HTTP status, redirect, assigns, LiveView render/mount
├── Integration (multi-context flows) → DataCase with async: false
│   Test: order → payment → notification chain
│   Use `setup` to orchestrate test data and verify side effects
└── Property-based → StreamData / PropCheck
    Test: encoding/decoding, sorting, state machine invariants
    Run 100 iterations per test to find edge cases
```

### Context Boundary Decision Tree
```
Where does this code belong?
├── Database query with business rules → Context module (Accounts, Orders)
│   Context calls Repo, applies filtering/validation, returns results
├── Schema definition → Ecto schema module
│   Field types, validations, associations, virtual fields
│   NO business logic, NO Repo calls
├── External service → Dedicated context (Billing, Email, SMS)
│   Wraps third-party API, handles retry/auth/response parsing
├── Cross-context orchestration → Parent context or pipeline
│   Order checkout: Accounts -> Orders -> Billing -> Notifications
│   Each step calls the next context's public API
└── Shared data transformation → Utility module (MyApp.Utils)
    No side effects, no Repo, no GenServer calls — pure functions only
```

### Deployment Strategy Decision Tree
```
Production hosting choice?
├── Bare metal / VPS → mix release + systemd service
│   Build: mix release on CI, scp to server, restart
│   Monitoring: Prometheus (telemetry_metrics_prometheus) + Grafana
│   Logs: JSON logger -> journald -> Loki
├── Docker / Kubernetes → Multi-stage Dockerfile with distroless runtime
│   Builder: elixir:1.17-slim → deps.get → compile → release
│   Runtime: gcr.io/distroless/cc-debian12
│   Config: environment variables at deploy time (not build time)
├── Fly.io → fly.toml with release_command for migrations
│   `fly deploy` with `--ha` for multi-region
│   Postgres: Fly Postgres with read replicas per region
└── Gigalixir / Render → Git-push deployment
    Config: runtime.exs reads DATABASE_URL env var
    Migrations: release command step in dashboard
```

### Phoenix PubSub & Presence
```elixir
# Broadcasting to all connected users
Phoenix.PubSub.broadcast(MyApp.PubSub, "room:lobby", {:new_message, message})

# Presence tracking
defmodule MyAppWeb.Presence do
  use Phoenix.Presence,
    otp_app: :my_app,
    pubsub_server: MyApp.PubSub
end

# In socket
defmodule MyAppWeb.UserSocket do
  use Phoenix.Socket

  channel("room:*", MyAppWeb.RoomChannel)

  def connect(_params, socket, _connect_info) do
    {:ok, assign(socket, :user_id, socket.assigns.current_user.id)}
  end

  def id(_socket), do: nil
end

# In LiveView — track presence
def mount(_params, _session, socket) do
  MyAppWeb.Presence.track(self(), "room:lobby", %{
    user_id: socket.assigns.current_user.id,
    online_at: inspect(System.system_time(:second))
  })
  {:ok, socket}
end
```

## References
- `references/otp-supervision.md` — Supervision trees, GenServer, Task, Agent
- `references/phoenix-live-view.md` — Phoenix LiveView, Channels, PubSub
- `references/elixir-fundamentals.md` — Elixir Fundamentals
- `references/elixir-advanced.md` — Advanced Elixir Patterns
- `references/elixir-deployment.md` — Elixir Deployment Guide

## Implementation Patterns

### Pattern: Ecto Schema with Soft Delete and Scoping

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Query

  schema "users" do
    field :email, :string
    field :role, :string, default: "user"
    field :deleted_at, :naive_datetime
    timestamps()
  end

  def active(query \\ __MODULE__) do
    from q in query, where: is_nil(q.deleted_at)
  end

  def by_role(query, role) do
    from q in query, where: q.role == ^role
  end
end

# Usage
MyApp.Repo.all(User |> User.active |> User.by_role("admin"))
```

### Pattern: Backoff Retry with Circuit Breaker

```elixir
defmodule MyApp.Retry do
  def with_backoff(opts \\ []) do
    max_retries = Keyword.get(opts, :max_retries, 3)
    base_delay = Keyword.get(opts, :base_delay, 100)
    max_delay = Keyword.get(opts, :max_delay, 5000)

    Enum.reduce_while(1..(max_retries + 1), :error, fn attempt, _acc ->
      case apply(fun, args) do
        {:ok, result} -> {:halt, {:ok, result}}
        {:error, reason} when attempt <= max_retries ->
          delay = min(base_delay * :math.pow(2, attempt - 1) |> round, max_delay)
          Process.sleep(delay + :rand.uniform(delay))
          {:cont, {:error, reason}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end
end
```

## Production Considerations

### Configuration Management
- Use `config/runtime.exs` for all env-dependent config. `config/prod.exs` for compile-time config only.
- Secrets in environment variables or Vault. Never commit `.secret` files.
- Release config: `RELEASE_CONFIG_DIR` points to external config directory. Overrides at runtime without rebuild.
- Feature flags via persistent_term or a GenServer loaded from DB at boot. Toggle without restart.

### Error Budget for Elixir Services
- Alert on: process mailbox size > 1000, ETS table exceeding 80% memory limit, Oban job failure rate > 5%.
- Memory: BEAM typically uses 30-50% more memory than equivalent JVM app. Budget accordingly.
- Crash dumps: `erl_crash.dump` written on BEAM crash. Analyze with `crashdump_viewer`.
- Logger level: set `:debug` in dev, `:info` in staging, `:warn` in prod. Never < :warn in prod.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| `Task.start` without supervision | Process orphaned on crash. Memory leak. | `Task.Supervisor.async` under DynamicSupervisor |
| `send_after` loop for polling | Wastes process cycles. Timer drift. | Use `Registry` + PubSub push pattern |
| Ecto schema with 30+ associations | Slow preloads. Complex migration dependencies. | Break into bounded contexts. Lazy load. |
| GenServer `handle_info(:timeout)` | Only fires if init returns :timeout tuple. Confusing. | Use `Process.send_after(self(), :tick, interval)` |
| Nested `if` in templates | Unreadable. Hard to test. | Move logic to helper/component. Use `cond` or `case`. |
| Phoenix channel per user | 100k users = 100k connections. | Use presence + PubSub broadcast. DynamicSupervisor per room. |

## Performance Optimization

- `IO.iodata_to_binary/1` for string building: 10x faster than `<>` concatenation.
- ETS read-only tables: `read_concurrency: true` for high-read workloads.
- `Task.async_stream` with `max_concurrency: System.schedulers_online() * 2`.
- `Cachex` for TTL-based caching: background refresh before expiry.
- LiveView `temp_assign` for assigns that update frequently without persisting across reconnects.
- Phoenix `~H` sigil over `.heex` templates: compile-time verification.
- Ecto `Repo.insert_all` / `Repo.update_all` for batch operations. Skips changeset validation.

## Security Considerations

- Plug `:put_secure_browser_headers` — enables HSTS, X-Frame-Options, X-Content-Type-Options.
- Ecto changeset `cast/3` whitelist: never cast all params. Reject unexpected fields with `validate_change`.
- Argon2 for passwords (memory-hard). Cost: 2^18 iterations, 16MB memory per hash.
- Phoenix Token for signed/encrypted tokens. Use `Phoenix.Token.sign/4` for invite links, password resets.
- CORS: restrict to known origins. Pre-flight OPTIONS handling with `CORSPlug`.
- SQL injection protection: Ecto parameterized queries. Never raw `Ecto.Adapters.SQL.query!(Repo, "SELECT ... #{unsafe}")`.
- LiveView: autoload `:current_user` in assigns. Verify on every handle_event/handle_params.
- Rate limiting: `ExRated` with GenServer-backed bucket. Apply to auth, signup, password-reset endpoints.
- Dependency audit: `mix hex.audit` in CI. Fail on known vulnerabilities.
- Secrets: `config/runtime.exs` reads from environment. Never `config/prod.exs` with hardcoded values.
