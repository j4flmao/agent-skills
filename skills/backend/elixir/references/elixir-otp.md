# Elixir & OTP

## Processes

Elixir processes are lightweight (1-2KB each). Thousands can run concurrently.

```elixir
# Spawn a process
pid = spawn(fn -> IO.puts("Hello from #{inspect self()}") end)

# Send and receive
send(pid, {:message, "hello"})
receive do
  {:message, msg} -> IO.puts(msg)
  after 5000 -> IO.puts("timeout")
end

# Spawn with link (auto-crash propagation)
spawn_link(fn -> raise "boom" end)

# Spawn with monitor (notification on exit)
{pid, ref} = spawn_monitor(fn -> :timer.sleep(1000) end)
receive do
  {:DOWN, ^ref, :process, ^pid, reason} -> IO.puts("Died: #{reason}")
end
```

## GenServer

```elixir
defmodule MyApp.Counter do
  use GenServer

  # Client API
  def start_link(initial_value) do
    GenServer.start_link(__MODULE__, initial_value, name: __MODULE__)
  end

  def inc(amount \\ 1) do
    GenServer.call(__MODULE__, {:inc, amount})
  end

  def dec(amount \\ 1) do
    GenServer.call(__MODULE__, {:dec, amount})
  end

  def value do
    GenServer.call(__MODULE__, :value)
  end

  # Server callbacks
  @impl true
  def init(initial_value) do
    {:ok, %{count: initial_value}}
  end

  @impl true
  def handle_call({:inc, amount}, _from, state) do
    new_count = state.count + amount
    {:reply, new_count, %{state | count: new_count}}
  end

  @impl true
  def handle_call({:dec, amount}, _from, state) do
    new_count = state.count - amount
    {:reply, new_count, %{state | count: new_count}}
  end

  @impl true
  def handle_call(:value, _from, state) do
    {:reply, state.count, state}
  end
end
```

### GenServer Callbacks

| Callback | Trigger | Response |
|----------|---------|----------|
| `init(state)` | Process starts | `{:ok, state}` or `{:stop, reason}` |
| `handle_call(msg, from, state)` | `GenServer.call/3` | `{:reply, reply, state}` |
| `handle_cast(msg, state)` | `GenServer.cast/2` | `{:noreply, state}` |
| `handle_info(msg, state)` | `send/2` or :timer | `{:noreply, state}` |
| `terminate(reason, state)` | Process exits | Cleanup |

## Agents

```elixir
# Simple state wrapper
{:ok, agent} = Agent.start_link(fn -> %{} end)

Agent.update(agent, fn state -> Map.put(state, :key, "value") end)
value = Agent.get(agent, fn state -> state[:key] end)

# Named agent
Agent.start_link(fn -> [] end, name: MyApp.Cart)
Agent.update(MyApp.Cart, fn cart -> [item | cart] end)
```

## Tasks

```elixir
# Async task
task = Task.async(fn -> heavy_computation() end)
result = Task.await(task, :timer.seconds(5))

# Supervised task
children = [
  {Task, fn -> stream_data() end},
]

# Task with child spec
Task.start_link(fn -> IO.puts("background work") end)
```

## Supervision Trees

### Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `:one_for_one` | Restart only crashed child | Independent workers |
| `:one_for_all` | Restart all children | Dependent processes (e.g., DB pool) |
| `:rest_for_one` | Restart crashed + children started after | Dependency chains |
| `:simple_one_for_one` | Dynamic children at runtime | Worker pools |

```elixir
defmodule MyApp.Supervisor do
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, :ok, opts)
  end

  @impl true
  def init(:ok) do
    children = [
      MyApp.Repo,
      {Phoenix.PubSub, name: MyApp.PubSub},
      MyAppWeb.Endpoint,
      {MyApp.Workers.Cache, [ttl: 300]},
      {Oban, oban_config()},
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

### DynamicSupervisor

```elixir
defmodule MyApp.DynamicSupervisor do
  use DynamicSupervisor

  def start_link(opts) do
    DynamicSupervisor.start_link(__MODULE__, :ok, opts)
  end

  @impl true
  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end
end

# Start child at runtime
DynamicSupervisor.start_child(MyApp.DynamicSupervisor, {MyApp.Worker, args})
```

## ETS (Erlang Term Storage)

```elixir
# Create table
:ets.new(:cache, [:named_table, :public, read_concurrency: true, write_concurrency: true])

# Insert
:ets.insert(:cache, {:products, [%Product{}]})

# Lookup
case :ets.lookup(:cache, :products) do
  [{:products, products}] -> products
  [] -> nil
end

# Match
:ets.match(:cache, {:"$1", :"$2"})

# Delete
:ets.delete(:cache)
:ets.delete_all_objects(:cache)

# Table types
:set      # Unique keys (default)
:ordered_set  # Ordered by key
:bag      # Multiple values per key
:duplicate_bag  # Duplicate values per key
```

## Phoenix PubSub

```elixir
# Subscribe to topic
Phoenix.PubSub.subscribe(MyApp.PubSub, "products")

# Broadcast to topic
Phoenix.PubSub.broadcast(MyApp.PubSub, "products", {:product_updated, product})

# Handle in LiveView
@impl true
def handle_info({:product_updated, _product}, socket) do
  {:noreply, assign(socket, :products, Catalog.list_products())}
end

# Broadcast from Ecto schema
defmodule MyApp.Catalog.Product do
  use Ecto.Schema
  use MyApp.SchemaHelpers

  after_insert fn product ->
    Phoenix.PubSub.broadcast(
      MyApp.PubSub,
      "products",
      {:product_created, product}
    )
  end
end
```

## Registry

```elixir
# Named process registry
Registry.start_link(keys: :unique, name: MyApp.Registry)

# Register process
{:ok, _} = Registry.register(MyApp.Registry, "user_123", %{})

# Lookup
[{pid, value}] = Registry.lookup(MyApp.Registry, "user_123")

# Dispatch
Registry.dispatch(MyApp.Registry, "user_123", fn entries ->
  for {pid, _} <- entries, do: send(pid, :update)
end)
```

## Config

```elixir
# config/config.exs
import Config

config :my_app,
  ecto_repos: [MyApp.Repo]

config :my_app, MyAppWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [view: MyAppWeb.ErrorView, accepts: ~w(html json)],
  pubsub_server: MyApp.PubSub

config :my_app, MyApp.Repo,
  migration_timestamps: [type: :utc_datetime]

import_config "#{config_env()}.exs"
```

```elixir
# config/runtime.exs (production secrets)
import Config

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise "DATABASE_URL missing"

  config :my_app, MyApp.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "SECRET_KEY_BASE missing"

  config :my_app, MyAppWeb.Endpoint,
    secret_key_base: secret_key_base
end
```

## Mix Tasks

```elixir
# lib/mix/tasks/seed.ex
defmodule Mix.Tasks.Seed do
  use Mix.Task

  @shortdoc "Seeds the database"

  def run(_args) do
    MyApp.Repo.start_link()

    for i <- 1..100 do
      MyApp.Accounts.register_user(%{
        email: "user#{i}@test.com",
        username: "user#{i}",
        password: "password123",
      })
    end

    IO.puts("Seeded 100 users")
  end
end
```

```bash
mix seed                                    # Run custom task
mix run priv/repo/seeds.exs                # Run seed script
mix run -e "IO.puts(MyApp.Repo.aggregate(:count))"  # Inline script
mix app.start                               # Start app without web server
```

## Error Handling

```elixir
# Pattern matching on tuples
case MyApp.Accounts.register_user(attrs) do
  {:ok, user} -> {:ok, user}
  {:error, changeset} -> {:error, changeset}
end

# With statement
with {:ok, user} <- MyApp.Accounts.register_user(attrs),
     {:ok, profile} <- MyApp.Accounts.create_profile(user, profile_attrs) do
  {:ok, %{user: user, profile: profile}}
else
  {:error, reason} -> {:error, reason}
end

# Try/rescue (rare — prefer pattern matching)
try do
  risky_operation()
rescue
  RuntimeError -> {:error, "runtime error"}
  MatchError -> {:error, "match error"}
end

# Supervision handles crashes — let it crash philosophy
# Don't rescue — let supervisor restart the process
```
