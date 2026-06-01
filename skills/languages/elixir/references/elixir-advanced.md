# Advanced Elixir Patterns

## Macros & Metaprogramming

Macros operate on the AST at compile time, enabling code generation and DSL creation:

### Basic Macro
```elixir
defmodule MyAssertion do
  defmacro assert(expression) do
    quote do
      unless unquote(expression) do
        raise AssertionError, message: "Expected truthy: #{unquote(Macro.to_string(expression))}"
      end
    end
  end
end
```

### Hygiene
Macros are hygienic by default — variables defined inside the macro don't leak out. Use `var!` to bypass hygiene intentionally:
```elixir
defmodule Counter do
  defmacro increment do
    quote do
      var!(count) = var!(count, Elixir) + 1
    end
  end
end
```

### compile_time_application
Use `@external_resource` and `@compile` to read files at compile time and embed them in the binary:
```elixir
defmodule MyApp.Version do
  @external_resource "VERSION"
  @version File.read!("VERSION") |> String.trim()

  def version, do: @version
end
```

### When to Write Macros
- DSL creation (Ecto schema, Phoenix routes, testing frameworks)
- Compile-time code generation based on external data
- Removing boilerplate that can't be done with functions
- Avoid macros for: simple abstractions (use functions), runtime decisions

## Distributed Elixir with libcluster

For multi-node Elixir deployments:
```elixir
# mix.exs
{:libcluster, "~> 3.3"}

# Application.ex
children = [
  {Cluster.Supervisor,
   [topologies, [name: MyApp.ClusterSupervisor]]},
  {Horde.Registry, name: MyApp.Registry, keys: :unique},
  {Horde.DynamicSupervisor, name: MyApp.DynamicSupervisor, strategy: :one_for_one},
]
```

Topology strategies: `Cluster.Strategy.Epmd` (DNS-based), `Cluster.Strategy.Kubernetes.DNS` (K8s DNS), `Cluster.Strategy.Gossip` (UDP multicast). Node discovery is automatic — new nodes join the cluster and can communicate via `Node.spawn/2` or `GenServer` calls.

## GenServer Advanced Patterns

### Named Process Registry
```elixir
defmodule OrderServer do
  use GenServer

  def start_link(id) do
    GenServer.start_link(__MODULE__, id, name: via_tuple(id))
  end

  defp via_tuple(id), do: {:via, Registry, {MyApp.Registry, {:order_server, id}}}
end
```

### Continuous Messages
```elixir
defmodule Heartbeat do
  use GenServer

  def init(_) do
    schedule_heartbeat()
    {:ok, %{last_beat: nil}}
  end

  def handle_info(:heartbeat, state) do
    # Do periodic work
    schedule_heartbeat()
    {:noreply, %{state | last_beat: DateTime.utc_now()}}
  end

  defp schedule_heartbeat do
    Process.send_after(self(), :heartbeat, 5_000)
  end
end
```

### GenServer Callbacks Reference
| Callback | Purpose | Return |
|----------|---------|--------|
| `init/1` | Initialize state | `{:ok, state}` |
| `handle_call/3` | Synchronous request | `{:reply, result, state}` |
| `handle_cast/2` | Asynchronous request | `{:noreply, state}` |
| `handle_info/2` | Process messages (timers, monitors) | `{:noreply, state}` |
| `terminate/2` | Cleanup on shutdown | `:ok` (any) |
| `code_change/3` | Hot code reload | `{:ok, state}` |

## OTP Supervision Advanced

### DynamicSupervisor
Start children at runtime (not at compile time):
```elixir
defmodule MyApp.TaskSupervisor do
  use DynamicSupervisor

  def start_link(_) do
    DynamicSupervisor.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_worker(id) do
    child_spec = {Worker, [id]}
    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end
end
```

### Supervision Strategies
| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `:one_for_one` | Restart only the failed child | Independent processes |
| `:one_for_all` | Restart all children | Interdependent services |
| `:rest_for_one` | Restart failed child + later children | Sequential dependencies |
| `:simple_one_for_one` | Same child spec for all (deprecated) | Dynamic workers |

### Restart Strategies
- `:permanent` (default): Always restart, even on normal exit
- `:temporary`: Never restart
- `:transient`: Restart only on abnormal exit (not `:normal`)

## Ecto Advanced

### Multi for Transactions
```elixir
Multi.new()
|> Multi.insert(:user, User.changeset(%User{}, user_params))
|> Multi.insert(:profile, fn %{user: user} ->
  Profile.changeset(%Profile{}, Map.put(profile_params, :user_id, user.id))
end)
|> Multi.run(:send_email, fn _repo, %{user: user} ->
  EmailService.send_welcome(user)
end)
|> Repo.transaction()
```

### Fragments & Raw SQL
```elixir
from p in Post,
  where: fragment("search_vector @@ plainto_tsquery('english', ?)", ^query),
  order_by: fragment("ts_rank(search_vector, plainto_tsquery('english', ?)) DESC", ^query)
```

### Preloading with Conditions
```elixir
from u in User,
  where: u.active == true,
  preload: [orders: ^from(o in Order, where: o.status == :paid, limit: 5)]
```

## Phoenix PubSub Advanced

### Cross-Node Broadcasting
```elixir
# Broadcast to all nodes in the cluster
Phoenix.PubSub.broadcast(MyApp.PubSub, "user:#{user_id}", {:update, data})

# Subscribe in LiveView
def mount(_params, _session, socket) do
  if connected?(socket) do
    Phoenix.PubSub.subscribe(MyApp.PubSub, "user:#{socket.assigns.current_user.id}")
  end
  {:ok, socket}
end

def handle_info({:update, data}, socket) do
  {:noreply, assign(socket, :data, data)}
end
```

### Fastlane (Phoenix 1.7+)
Phoenix 1.7+ enables `Phoenix.LiveView.Stream` for efficient list diffs:
```elixir
# 10x faster than traditional assigns for large lists
{:ok, stream(socket, :orders, Orders.list_orders())}

def handle_info({:new_order, order}, socket) do
  {:noreply, stream_insert(socket, :orders, order)}
end

def handle_info({:remove_order, order}, socket) do
  {:noreply, stream_delete(socket, :orders, order)}
end
```
