---
name: elixir
description: >
  Use this skill when building with Elixir — Phoenix framework, OTP, BEAM, LiveView, Ecto, supervision trees. This skill enforces: OTP design principles, Phoenix context boundaries, LiveView state management, Ecto schema conventions, supervision tree structure. Do NOT use for: non-Elixir projects, frontend JavaScript, simple scripts better suited for Bash/Python.
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
      accounts/              # Context: accounts
        user.ex              # Ecto schema
        user_notifier.ex     # Boundary call
        user_token.ex
        accounts.ex           # Context module (public API)
      catalog/               # Context: catalog
        product.ex
        category.ex
        catalog.ex
      store/                 # Context: orders
        order.ex
        line_item.ex
        store.ex
      web/
        endpoint.ex           # Phoenix endpoint
        router.ex             # Router
        controllers/          # Controllers (non-LiveView)
          user_session_controller.ex
        live/                 # LiveViews
          product_live/
            index.ex
            show.ex
          cart_live/
            index.ex
        components/           # Shared components
          layout.ex           # App layout
          navbar.ex
          product_card.ex
        templates/            # Templates (non-LiveView)
          layout/
      mailer.ex               # Mailer (Swoosh/Bamboo)
    my_app.ex                 # Module aliases
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
# lib/my_app/accounts/accounts.ex
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

  defp check_password(nil, _password), do: false
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
    row_click={fn {_id, product} -> navigate(~p"/products/#{product}")}
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
    children = [
      # Start Ecto repo
      MyApp.Repo,

      # Start Telemetry
      {Phoenix.PubSub, name: MyApp.PubSub},

      # Start Phoenix endpoint
      MyAppWeb.Endpoint,

      # Start workers
      MyApp.Workers.ProductCache,
      MyApp.Workers.EmailQueue,
      MyApp.Workers.SessionCleaner,

      # Start Oban for background jobs
      {Oban, oban_config()},
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp oban_config do
    Oban.Config.new(
      repo: MyApp.Repo,
      queues: [default: 10, emails: 5, cleanup: 1],
      prune: :active,
    )
  end
end
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
    # Schedule initial cache refresh
    send(self(), :refresh)
    {:ok, state}
  end

  @impl true
  def handle_info(:refresh, state) do
    products = MyApp.Catalog.list_products()
    :ets.new(:product_cache, [:named_table, :public, read_concurrency: true])
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

### Reference Files
- `references/elixir-otp.md` — Processes, GenServer, supervision trees, OTP patterns
- `references/phoenix-ecto.md` — Phoenix routes, LiveView, Ecto schema/queries, contexts
- `references/elixir-testing-exunit.md` — ExUnit, Mox, ExMachina, DataCase, ConnCase patterns
- `references/elixir-ecto-advanced.md` — Complex queries, Ecto.Multi, dynamic filters, changeset patterns

### Related Skills
- `backend/nodejs/express/SKILL.md` — Alternative Node.js approach
- `backend/universal/api-response/SKILL.md` — API response formatting

## Handoff
Hand off to `backend/universal/testing/SKILL.md` for ExUnit testing patterns or backend-deployment skill for Elixir releases.
