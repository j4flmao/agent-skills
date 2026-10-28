---
name: backend-elixir
description: >
  Use this skill when the user says 'elixir backend', 'phoenix', 'phoenix liveview', 'ecto', 'otp supervision tree', 'genserver', 'oban', 'phoenix pubsub', 'mix phx.new'. Builds Phoenix/Elixir backends: contexts, Ecto schemas and migrations, LiveView, supervision trees, GenServer/ETS state, Oban jobs, releases and observability. Do NOT use for: Elixir language fundamentals outside web backends (languages skill for Elixir), non-Elixir stacks, frontend JavaScript.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, elixir, phase-10]
---

# Elixir

## Purpose
Build fault-tolerant, concurrent applications with Elixir/OTP — Phoenix web layer, LiveView interactivity, Ecto persistence, supervision trees, process architecture.

## Agent Protocol

### Trigger
User request includes: `Elixir`, `Phoenix`, `Phoenix LiveView`, `OTP`, `BEAM`, `Elixir macros`, `Ecto`, `mix`, `phx.gen`, `Supervisor`, `GenServer`, `Phoenix channels`, `Phoenix PubSub`, `Elixir processes`, `iex`.

### Input Context
- Framework (Phoenix, Phoenix LiveView, bare Elixir)
- Persistence (Ecto with PostgreSQL, Ecto with SQLite, ETS)
- State management (GenServer, Agent, ETS, Phoenix PubSub)
- Deployment (Elixir releases, Docker, Gigalixir, Fly.io)

### Output Artifact
Phoenix project structure, OTP supervision tree, Ecto schema, LiveView module, router config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Phoenix project generated with mix phx.new
- Contexts separated by domain boundary
- Ecto schemas with proper associations
- LiveView with state management and event handling
- Supervision tree with appropriate restart strategy

### Max Response Length
4096 tokens

## Workflow

### Step 1: Phoenix Project Setup

```bash
# Install Phoenix
mix archive.install hex phx_new

# Create new Phoenix app
mix phx.new my_app --database postgres
mix phx.new my_app --database sqlite3  # Alternative

# Setup database
mix ecto.create
mix ecto.migrate

# Start server
mix phx.server
```

```
my_app/
  lib/
    my_app/
      application.ex         # OTP application start
      repo.ex                # Ecto Repo
      accounts.ex            # Context module (public API)
      accounts/              # Context internals
        user.ex              # Ecto schema
        user_notifier.ex
        user_token.ex
      catalog.ex
      catalog/
        product.ex
        category.ex
      store.ex               # Context: orders
      store/
        order.ex
        line_item.ex
      mailer.ex              # Swoosh mailer
    my_app_web/              # Web layer (separate namespace MyAppWeb)
      endpoint.ex
      router.ex
      controllers/
        user_session_controller.ex
      live/
        product_live/
          index.ex
          show.ex
      components/
        core_components.ex
        layouts.ex
    my_app.ex
    my_app_web.ex
  priv/
    repo/
      migrations/
        20250101000000_create_users.exs
  config/
    config.exs
    dev.exs
    prod.exs
    runtime.exs
  mix.exs
```

### Step 2: Ecto Schema and Migration

```elixir
# priv/repo/migrations/20250101000000_create_users.exs
defmodule MyApp.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :email, :string, null: false
      add :username, :string, null: false
      add :hashed_password, :string, null: false
      add :role, :string, default: "user"
      add :confirmed_at, :naive_datetime
      add :deleted_at, :naive_datetime
      timestamps()
    end

    create unique_index(:users, [:email])
    create unique_index(:users, [:username])
    create index(:users, [:deleted_at])
  end
end
```

```elixir
# lib/my_app/accounts/user.ex
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :username, :string
    field :role, :string, default: "user"
    field :hashed_password, :string, redact: true
    field :confirmed_at, :naive_datetime
    field :deleted_at, :naive_datetime

    has_many :orders, MyApp.Store.Order
    has_one :profile, MyApp.Accounts.Profile

    timestamps()
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :username, :role])
    |> validate_required([:email, :username])
    |> validate_format(:email, ~r/@/)
    |> validate_length(:username, min: 3, max: 30)
    |> unique_constraint(:email)
    |> unique_constraint(:username)
  end
end
```

### Step 3: Context Boundary

```elixir
# lib/my_app/accounts.ex
defmodule MyApp.Accounts do
  @moduledoc """
  Accounts context — user registration, authentication, profile management.
  """
  import Ecto.Query, warn: false
  alias MyApp.Repo
  alias MyApp.Accounts.{User, UserToken, UserNotifier}

  @doc """
  Registers new user.
  """
  def register_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Returns user by id.
  """
  def get_user!(id), do: Repo.get!(User, id)

  @doc """
  Authenticates user by email and password.
  """
  def authenticate_by_email(email, password) do
    user = Repo.get_by(User, email: String.downcase(email))

    case check_password(user, password) do
      true -> {:ok, user}
      false -> {:error, :invalid_credentials}
    end
  end

  # Run a dummy hash when the user is missing so response time does not reveal which emails exist.
  defp check_password(nil, _password), do: Argon2.no_user_verify()
  defp check_password(user, password) do
    Argon2.verify_pass(password, user.hashed_password)
  end

  @doc """
  Lists all active users.
  """
  def list_users do
    Repo.all(from u in User, where: is_nil(u.deleted_at), order_by: u.inserted_at)
  end
end
```

### Step 4: Phoenix Router

```elixir
# lib/my_app_web/router.ex
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {MyAppWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug MyAppWeb.Plugs.Authenticate
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug MyAppWeb.Plugs.ApiAuth
  end

  # Browser routes
  scope "/", MyAppWeb do
    pipe_through :browser

    get "/", PageController, :index
    get "/login", UserSessionController, :new
    post "/login", UserSessionController, :create
    delete "/logout", UserSessionController, :delete

    live "/products", ProductLive.Index, :index
    live "/products/new", ProductLive.Index, :new
    live "/products/:id/edit", ProductLive.Index, :edit
    live "/products/:id", ProductLive.Show, :show
  end

  # Authenticated routes
  scope "/", MyAppWeb do
    pipe_through [:browser, :require_authenticated]

    live "/dashboard", DashboardLive, :index
    live "/cart", CartLive.Index, :index
    live "/orders", OrderLive.Index, :index
  end

  # API routes
  scope "/api/v1", MyAppWeb do
    pipe_through :api

    post "/users", Api.UserController, :create
    post "/sessions", Api.SessionController, :create
    get "/products", Api.ProductController, :index
  end
end
```

### Step 5: LiveView

```elixir
# lib/my_app_web/live/product_live/index.ex
defmodule MyAppWeb.ProductLive.Index do
  use MyAppWeb, :live_view

  alias MyApp.Catalog
  alias MyApp.Catalog.Product

  @impl true
  def mount(_params, _session, socket) do
    socket =
      socket
      |> assign(:page_title, "Products")
      |> stream(:products, Catalog.list_products())
      |> assign(:form, to_form(%{search: ""}))

    {:ok, socket}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :edit, %{"id" => id}) do
    socket
    |> assign(:page_title, "Edit Product")
    |> assign(:product, Catalog.get_product!(id))
  end

  defp apply_action(socket, :new, _params) do
    socket
    |> assign(:page_title, "New Product")
    |> assign(:product, %Product{})
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Products")
    |> assign(:product, nil)
  end

  @impl true
  def handle_event("search", %{"search" => query}, socket) do
    products = Catalog.search_products(query)
    {:noreply, stream(socket, :products, products, reset: true)}
  end

  @impl true
  def handle_info({MyAppWeb.ProductLive.Index, [:product_updated]}, socket) do
    {:noreply, stream(socket, :products, Catalog.list_products(), reset: true)}
  end
end
```

```elixir
# lib/my_app_web/live/product_live/index.html.heex
<div class="product-list">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">Products</h1>
    <.link navigate={~p"/products/new"}>
      <.button>New Product</.button>
    </.link>
  </div>

  <.form for={@form} phx-change="search" class="mb-4">
    <.input field={@form[:search]} placeholder="Search products..." />
  </.form>

  <.table
    id="products"
    rows={@streams.products}
    row_click={fn {_id, product} -> JS.navigate(~p"/products/#{product}") end}
  >
    <:col :let={{_id, product}} label="Name"><%= product.name %></:col>
    <:col :let={{_id, product}} label="Price"><%= product.price %></:col>
    <:col :let={{_id, product}} label="Stock"><%= product.stock_count %></:col>
    <:action :let={{_id, product}}>
      <.link navigate={~p"/products/#{product}/edit"}>Edit</.link>
    </:action>
  </.table>
</div>
```

### Step 6: OTP Supervision Tree

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    # Children start in order and stop in reverse: dependencies first, Endpoint last
    children = [
      MyAppWeb.Telemetry,
      MyApp.Repo,
      {Phoenix.PubSub, name: MyApp.PubSub},
      {Oban, Application.fetch_env!(:my_app, Oban)},
      MyApp.Workers.ProductCache,
      MyAppWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end

# config/config.exs
# config :my_app, Oban,
#   repo: MyApp.Repo,
#   queues: [default: 10, emails: 5, cleanup: 1],
#   plugins: [{Oban.Plugins.Pruner, max_age: 60 * 60 * 24 * 7}]
```

```elixir
# lib/my_app/workers/product_cache.ex
defmodule MyApp.Workers.ProductCache do
  use GenServer

  @cache_ttL :timer.minutes(5)

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @impl true
  def init(state) do
    # Create the table once; it lives as long as this owner process.
    :ets.new(:product_cache, [:named_table, :protected, read_concurrency: true])
    send(self(), :refresh)
    {:ok, state}
  end

  @impl true
  def handle_info(:refresh, state) do
    products = MyApp.Catalog.list_products()
    :ets.insert(:product_cache, {:products, products})
    Process.send_after(self(), :refresh, @cache_ttL)
    {:noreply, state}
  end

  def get_products do
    case :ets.lookup(:product_cache, :products) do
      [{:products, products}] -> products
      [] -> MyApp.Catalog.list_products()
    end
  end
end
```

## Rules
- Contexts (Accounts, Catalog, Store) contain all business logic for a domain. Cross-context calls go through public API functions.
- Ecto schemas map to database tables. Changesets handle all validation and casting.
- LiveViews hold state in socket assigns. Phoenix.Component for reusable markup.
- Supervision tree with :one_for_one strategy for workers, :rest_for_one for dependencies.
- GenServer for stateful processes, Agent for simple state, ETS for cache.
- Phoenix.PubSub for cross-process broadcasts (LiveView updates, notifications).
- Mix tasks for one-off jobs. Oban for scheduled/recurring background work.
- Config per environment with runtime.exs for production secrets.

## References
  - references/elixir-advanced.md — Elixir Advanced Topics
  - references/elixir-ecto-advanced.md — Elixir Ecto Advanced Patterns
  - references/elixir-fundamentals.md — Elixir Fundamentals
  - references/elixir-otp.md — Elixir & OTP
  - references/elixir-testing-exunit.md — Elixir Testing with ExUnit
  - references/phoenix-ecto.md — Phoenix & Ecto
## Architecture Decision Trees

### GenServer vs Agent vs ETS
```
State management pattern?
├── Mutable state with side effects → GenServer
│   Confirms that you need state transitions with side effects (sending emails, writing to DB).
│   Use handle_call for synchronous, handle_cast for fire-and-forget.
├── Simple state, no side effects → Agent
│   get/update pattern. No handle_call/cast boilerplate. Good for config, counters.
│   Risk: Agent.update is synchronous — wraps GenServer.call internally.
└── Read-heavy, rarely-changed → ETS
    No single-process bottleneck; concurrent reads. Good for reference data, caches.
    Risk: data lost on restart. Pair with Ecto for durability.
```

### Supervision Strategy Selection
```
Failure recovery requirement?
├── Children independent → :one_for_one
├── Dependency chain → :rest_for_one
│   If DB worker dies, restart DB before workers that depend on it.
├── All must be up → :one_for_all
│   If any child dies, restart all. Use for tightly coupled services.
└── Dynamic children → DynamicSupervisor
    For GenServers started at runtime (e.g., per-user processes).
```

## Implementation Patterns

### Pattern: Phoenix PubSub Broadcast with LiveView Update

```elixir
# lib/my_app/catalog.ex
defmodule MyApp.Catalog do
  alias MyApp.Repo
  alias MyApp.Catalog.Product

  def create_product(attrs) do
    %Product{}
    |> Product.changeset(attrs)
    |> Repo.insert()
    |> broadcast(:product_created)
  end

  defp broadcast({:ok, product}, event) do
    Phoenix.PubSub.broadcast(MyApp.PubSub, "products", {event, product})
    {:ok, product}
  end

  defp broadcast(error, _event), do: error
end

# lib/my_app_web/live/product_live/index.ex (mount)
def mount(_params, _session, socket) do
  if connected?(socket), do: Phoenix.PubSub.subscribe(MyApp.PubSub, "products")
  {:ok, stream(socket, :products, Catalog.list_products())}
end

def handle_info({:product_created, product}, socket) do
  {:noreply, stream_insert(socket, :products, product, at: 0)}
end
```

### Pattern: Ecto Multi for Transactional Operations

```elixir
def place_order(cart_id, customer_id) do
  Ecto.Multi.new()
  |> Ecto.Multi.run(:cart, fn _repo, _changes ->
    case get_cart(cart_id) do
      %Cart{status: :active} = cart -> {:ok, cart}
      _ -> {:error, :cart_not_found}
    end
  end)
  |> Ecto.Multi.run(:order, fn repo, %{cart: cart} ->
    %Order{customer_id: customer_id, total: cart.total}
    |> Order.changeset(%{})
    |> repo.insert()
  end)
  |> Ecto.Multi.run(:line_items, fn repo, %{order: order, cart: cart} ->
    now = NaiveDateTime.utc_now(:second)
    # insert_all takes plain maps (not structs) and does not autogenerate timestamps
    items = Enum.map(cart.items, fn item ->
      %{order_id: order.id, product_id: item.product_id, quantity: item.quantity,
        price: item.price, inserted_at: now, updated_at: now}
    end)
    {count, _} = repo.insert_all(LineItem, items)
    {:ok, count}
  end)
  |> Ecto.Multi.delete_all(:clear_cart, from(c in CartItem, where: c.cart_id == ^cart_id))
  |> Repo.transaction()
end
```

## Production Considerations

### Deployment Pipeline
```
mix release build → container image → CI tests → staging deploy → smoke tests → prod deploy
```
- Releases: `MIX_ENV=prod mix release` bundles BEAM + deps + config into self-contained directory.
- Database migrations run as separate step BEFORE new release starts. Never auto-migrate on app boot.
- Use `RELEASE_NODE` and `RELEASE_COOKIE` for distributed Erlang node clustering.
- Health checks: `/health` endpoint returns 200 when app is running. DB connectivity checked before startup completes.

### Monitoring & Observability
- Telemetry events: `[:phoenix, :endpoint, :stop]` for request duration, `[:ecto, :query, :total]` for DB.
- Export: TelemetryMetricsPrometheus for `/metrics` endpoint scraped by Prometheus.
- Key metrics: request latency (p50/p95/p99), DB query timing, LiveView socket count, process count, memory.
- Logging: use `Logger.metadata()` with request_id, user_id, tenant_id for structured logs.
- Alert on: process mailbox size > 1000, ETS table growth, Oban queue depth.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| GenServer as DB replacement | State lost on crash, restart resets. No durability. | Use Ecto for persistent data; GenServer for cache/state only |
| `IO.inspect` debugging in prod | Ships in the release and writes internal state to stdout | `Logger.debug/1`; set `config :logger, level: :info` in prod (or `compile_time_purge_matching` to strip debug calls at compile time) |
| Phoenix context cross-calls | Context A calls Context B's Repo directly. Breaks encapsulation. | Always go through public context API functions |
| Large Ecto preloads in LiveView | 10+ preloads per query = slow mounts. | Paginate, lazy-load, or use ETS cache for reference data |
| Rescheduling `send_after` without tracking the ref | Duplicate timers pile up when refresh is also triggered manually | Keep the timer ref in state and `Process.cancel_timer/1` before rescheduling |
| `:infinity` GenServer timeout | Blocks caller indefinitely. Cascading failure on stuck call. | Always set explicit timeout (default 5000ms) |

## Performance Optimization

- Streams over Enum for large collections: `Stream.map` / `Stream.filter` avoid intermediate list allocation.
- ETS read concurrency: `:named_table, :public, read_concurrency: true` for read-heavy workloads.
- Ecto query optimization: `select` only needed fields; preload with a custom query (`preload: [items: ^from(i in Item, select: [:id, :name])]`) or join-preload to avoid N+1.
- Phoenix LiveView stream diffing: `stream_insert` / `stream_delete` over full re-render for list performance.
- `IO.iodata_to_binary/1` for string concatenation in hot paths — avoids binary copying.
- `:persistent_term` for rarely-changing configuration — very fast reads, but every update triggers a global GC scan, so never use it for frequently written data.
- Oban job batching: batch similar jobs into single worker execution to reduce DB roundtrips.
- Caching with Cachex: `Cachex.fetch(:products, key, fn -> Catalog.get_product(id) end)` with TTL.

## Security Considerations

- Phoenix Router: `:put_secure_browser_headers` plug enabled by default. Don't disable.
- Ecto changesets prevent mass-assignment via `cast/3`. Never use `cast(attrs, [:all])`.
- Password hashing: `Argon2` (memory-hard) over `bcrypt`. Never store plaintext or MD5/SHA.
- Session tokens stored in signed cookies (default). Use database-backed sessions for sensitive apps.
- CORS: configure `CORSPlug` or `Corsica` with explicit origins. Never `Access-Control-Allow-Origin: *` for auth endpoints.
- SQL injection: Ecto's parameterized queries prevent injection. Never use `Ecto.Adapters.SQL.query!` with string interpolation.
- LiveView: validate user permissions in handle_params/handle_event, not just in assigns.
- Rate limiting: use Hammer or ExRated for per-IP/per-user rate limiting on auth endpoints.
- Dependencies: `mix hex.audit` (retired packages) and `mix deps.audit` from `mix_audit` (known vulnerabilities) in CI; commit mix.lock.
