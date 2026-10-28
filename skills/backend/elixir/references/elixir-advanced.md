# Elixir Advanced Topics

Advanced Elixir for production backends: metaprogramming with macros, protocols and behaviours, releases and runtime configuration, clustering and distribution, native code (NIFs and ports), observability with `:telemetry`, and performance analysis on the BEAM. OTP supervision, Ecto and testing are covered in sibling references.

## Macros and Metaprogramming

Macros receive and return quoted code (AST) at compile time.

```elixir
quote do: 1 + 2
# {:+, [context: Elixir, imports: [{1, Kernel}, {2, Kernel}]], [1, 2]}

defmodule MyApp.Guards do
  defmacro is_positive_integer(value) do
    quote do
      is_integer(unquote(value)) and unquote(value) > 0
    end
  end
end
```

`defguard` is the preferred way to define guard-safe macros:

```elixir
defmodule MyApp.Guards do
  defguard is_positive_integer(value) when is_integer(value) and value > 0
end
```

### `__using__` for shared setup

```elixir
defmodule MyApp.Schema do
  defmacro __using__(_opts) do
    quote do
      use Ecto.Schema
      @primary_key {:id, :binary_id, autogenerate: true}
      @foreign_key_type :binary_id
      @timestamps_opts [type: :utc_datetime_usec]
    end
  end
end

defmodule MyApp.Accounts.User do
  use MyApp.Schema
  schema "users" do
    field :email, :string
    timestamps()
  end
end
```

Rules:
- Use a function when a function works; macros are harder to read and debug.
- Keep `quote` blocks small; delegate logic to regular functions called from the generated code.
- Macros are hygienic: variables defined inside `quote` do not leak unless `var!/1` is used deliberately.
- Inspect expansion with `Macro.expand/2` and `Macro.to_string/1` while developing.

## Protocols vs Behaviours

| | Protocol | Behaviour |
|---|----------|-----------|
| Dispatch on | Data type of the first argument | Module chosen by the caller/config |
| Example | `Jason.Encoder`, `Enumerable`, `String.Chars` | `GenServer`, `Plug`, custom adapters |
| Extension | Implement for your struct anywhere | Module declares `@behaviour` and implements callbacks |

```elixir
defprotocol MyApp.Redactable do
  @spec redact(t) :: t
  def redact(data)
end

defimpl MyApp.Redactable, for: MyApp.Accounts.User do
  def redact(user), do: %{user | email: "[redacted]", password_hash: nil}
end
```

```elixir
defmodule MyApp.Payments.Gateway do
  @callback charge(amount :: Decimal.t(), token :: String.t()) :: {:ok, String.t()} | {:error, term()}
end

defmodule MyApp.Payments.Stripe do
  @behaviour MyApp.Payments.Gateway
  @impl true
  def charge(amount, token), do: MyApp.Payments.StripeClient.create_charge(amount, token)
end

# selected by configuration, swapped for a mock (Mox) in tests
def gateway, do: Application.fetch_env!(:my_app, :payment_gateway)
```

Enable protocol consolidation (default in releases) for fast dispatch.

## Releases and Configuration

```bash
MIX_ENV=prod mix release
_build/prod/rel/my_app/bin/my_app start        # foreground: start; daemon: daemon
_build/prod/rel/my_app/bin/my_app remote       # attach a remote IEx shell
_build/prod/rel/my_app/bin/my_app eval "MyApp.Release.migrate()"
```

```elixir
# config/runtime.exs: evaluated at boot in the release
import Config

if config_env() == :prod do
  database_url = System.fetch_env!("DATABASE_URL")
  config :my_app, MyApp.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE", "10")),
    ssl: true

  config :my_app, MyAppWeb.Endpoint,
    secret_key_base: System.fetch_env!("SECRET_KEY_BASE"),
    server: true
end
```

- `config/config.exs` and env-specific files are compiled in; anything from environment variables belongs in `runtime.exs`.
- `System.fetch_env!/1` fails fast at boot if a variable is missing.
- Run migrations from a release module (`MyApp.Release.migrate/0` using `Ecto.Migrator`), not with `mix` (Mix is not available in releases).
- Container images: multi-stage build (`hexpm/elixir` builder, slim Debian runtime with matching OpenSSL and libc).

## Distribution and Clustering

```elixir
# libcluster topology for Kubernetes (headless service DNS)
config :libcluster,
  topologies: [
    k8s: [
      strategy: Cluster.Strategy.Kubernetes.DNS,
      config: [service: "my-app-headless", application_name: "my_app"]
    ]
  ]
```

- Nodes need the same Erlang cookie and reachable EPMD/distribution ports (or `-erl_epmd_port`-style fixed ports).
- Distribution is not encrypted by default; enable TLS distribution (`-proto_dist inet_tls`) or keep it on a private network.
- Cluster-wide registries: `:pg` process groups (built into OTP), Horde for distributed supervisors/registries, Phoenix.PubSub for messaging.
- Design for netsplits: global singletons (`:global`) can run twice during partitions; prefer idempotent work and database-backed locks/queues (e.g. Oban) for exactly-once business effects.

## Native Code

| Option | Isolation | Use |
|--------|-----------|-----|
| Port (external OS process) | Full; crash cannot take down the VM | Wrapping CLIs, long-running external tools |
| NIF | None; a crash or long call can kill/stall the VM | Small, fast functions |
| Dirty NIF | Runs on dirty schedulers | CPU- or IO-bound native work > 1 ms |
| Rustler (Rust NIFs) | Memory-safe Rust, still in-VM | Preferred way to write NIFs |

A regular NIF must return quickly (guidance: about 1 ms) or it blocks a scheduler; mark heavier work as dirty.

```elixir
defmodule MyApp.Hashing do
  use Rustler, otp_app: :my_app, crate: "hashing"
  def blake3(_data), do: :erlang.nif_error(:nif_not_loaded)
end
```

## Observability with Telemetry

```elixir
:telemetry.attach_many(
  "my-app-logger",
  [[:my_app, :repo, :query], [:phoenix, :endpoint, :stop]],
  &MyApp.TelemetryHandler.handle_event/4,
  nil
)

# emitting your own span
:telemetry.span([:my_app, :payments, :charge], %{order_id: id}, fn ->
  result = gateway().charge(amount, token)
  {result, %{order_id: id}}
end)
```

- `Telemetry.Metrics` + a reporter (Prometheus via PromEx/peep, StatsD) for metrics; OpenTelemetry Erlang/Elixir SDK for traces.
- Handlers run in the caller's process: keep them fast and never raise (a raising handler is detached).
- Use `Logger` with metadata (`Logger.metadata(request_id: id)`) and a JSON formatter in production.

## Performance on the BEAM

| Tool | Use |
|------|-----|
| `:observer` / `observer_cli` | Live view of processes, memory, schedulers |
| `recon` | Production-safe diagnostics (top processes by memory/reductions) |
| `:eprof`, `:fprof`, `:tprof` (OTP 27+) | Profiling (`mix profile.eprof`, `mix profile.tprof`) |
| Benchee | Micro-benchmarks |

Common issues:
- Large mailboxes: a slow consumer process receiving more messages than it handles. Apply back-pressure (GenStage/Broadway, bounded queues).
- Large binaries kept alive by small sub-binaries (`binary:copy/1` when storing slices long-term).
- Single GenServer bottleneck serializing all requests: partition by key, use ETS for reads.
- ETS: `read_concurrency: true` for read-heavy tables; `:persistent_term` for rarely changing global config.

## Checklist

- [ ] Macros only where functions cannot express the abstraction
- [ ] Behaviours for swappable adapters, protocols for type-based dispatch
- [ ] Releases with `runtime.exs`, fail-fast env vars, release-based migrations
- [ ] Cluster distribution secured; partition-tolerant designs
- [ ] NIFs via Rustler, dirty for long work; ports for untrusted/external tools
- [ ] Telemetry metrics/traces and JSON logs; mailbox and memory monitoring
