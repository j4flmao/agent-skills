# Elixir Fundamentals

## What is Elixir?

Elixir is a dynamic, functional programming language built on the Erlang VM (BEAM). It excels at concurrent, fault-tolerant, and distributed systems. The BEAM provides lightweight processes (green threads), preemptive scheduling, and "let it crash" error handling.

## Core Concepts

### Immutable Data
All data is immutable in Elixir. Instead of modifying, you transform. `list = [1, 2, 3]` and `new_list = [0 | list]` creates a new list, the original remains unchanged. This eliminates entire categories of bugs (race conditions, unexpected mutations).

### Pattern Matching
The `=` operator is a match operator, not assignment:
```elixir
x = 1          # Binds x to 1
1 = x          # Matches (both sides are 1)
{a, b} = {1, 2}  # Destructures: a=1, b=2
[head | tail] = [1, 2, 3]  # head=1, tail=[2,3]
```

### Pipe Operator
`|>` pipes the result of one function as the first argument to the next:
```elixir
orders
|> filter_by_status(:paid)
|> sort_by_date(:desc)
|> take(10)
|> preload(:customer)
```

### Processes
Not OS processes — BEAM processes are lightweight (microseconds to spawn, ~2KB each). A single BEAM node handles millions of concurrent processes. Processes communicate via message passing (no shared state):
```elixir
pid = spawn(fn -> receive do msg -> IO.inspect(msg) end end)
send(pid, {:hello, "world"})
```

## Key Data Types

### Atoms
Named constants (like symbols): `:ok`, `:error`, `:pending`. Used for status flags, module names.

### Tuples
Ordered, fixed-size collections: `{:ok, "result"}`, `{:error, :not_found}`. Common return pattern.

### Lists
Linked lists: `[1, 2, 3]`. Prepending is O(1), accessing by index is O(n).

### Maps
Key-value store: `%{name: "Alice", age: 30}`. Access with `map.key` or `Map.get(map, :key)`.

### Structs
Typed maps with defined keys and defaults: `%Order{status: :pending}`. Defined with `defstruct`.

### Strings
UTF-8 encoded binaries: `"hello"`. Interpolation: `"Hello #{name}"`.

## Mix Project Structure

```
my_app/
├── _build/          # Compiled artifacts
├── config/          # Configuration files
│   ├── config.exs   # Base config
│   ├── dev.exs      # Dev overrides
│   ├── prod.exs     # Prod overrides
│   └── runtime.exs  # Runtime configuration
├── deps/            # Dependencies
├── lib/             # Application code
│   ├── my_app.ex    # Top-level module
│   ├── my_app/      # Sub-modules
│   ├── my_app_web/  # Phoenix web layer
│   └── my_app/      # Business logic
├── priv/            # Static assets, migrations
├── test/            # Tests
│   ├── my_app/
│   └── support/
├── mix.exs          # Project definition
└── mix.lock         # Dependency lock file
```

## Common Mix Tasks

| Command | Purpose |
|---------|---------|
| `mix new my_app` | New OTP project |
| `mix phx.new my_app` | New Phoenix project |
| `mix deps.get` | Fetch dependencies |
| `mix deps.update all` | Update dependencies |
| `mix compile` | Compile (auto-runs when needed) |
| `mix test` | Run tests |
| `mix test test/path/to/file.exs:42` | Run single test |
| `mix format` | Format code |
| `mix format --check-formatted` | CI formatting check |
| `mix dialyzer` | Static type analysis |
| `mix credo` | Lint |
| `mix release` | Build production release |
| `mix ecto.create` | Create database |
| `mix ecto.migrate` | Run migrations |
| `mix phx.routes` | List all routes |
| `mix phx.gen.live` | Generate LiveView |

## Conditional Expressions

### case
```elixir
case result do
  {:ok, value} -> IO.puts("Success: #{value}")
  {:error, reason} -> IO.puts("Error: #{reason}")
  _ -> IO.puts("Unknown")
end
```

### cond
```elixir
cond do
  age >= 18 -> "Adult"
  age >= 13 -> "Teen"
  true -> "Child"
end
```

### with
Used for chaining fallible operations with early return:
```elixir
with {:ok, user} <- create_user(attrs),
     {:ok, order} <- create_order(user, order_attrs),
     :ok <- charge_payment(order) do
  {:ok, order}
else
  {:error, :validation} -> {:error, "Invalid data"}
  {:error, :payment} -> {:error, "Payment failed"}
end
```

## Error Handling

### try/rescue (Rarely used — "let it crash" is preferred)
```elixir
try do
  risky_operation()
rescue
  RuntimeError -> handle_error()
end
```

### Tagged Tuples (Preferred pattern)
```elixir
def divide(a, b) when b == 0, do: {:error, :division_by_zero}
def divide(a, b), do: {:ok, a / b}

case divide(10, 0) do
  {:ok, result} -> result
  {:error, reason} -> Logger.error("Division failed: #{reason}")
end
```

## Module Attributes

### Module Constants
```elixir
defmodule MyModule do
  @default_limit 50
  @retry_delays [100, 200, 500]

  def list_items(limit \\ @default_limit) do
    # ...
  end
end
```

### Compile-Time Accumulation
```elixir
defmodule Router do
  @routes []
  defmacro get(path, handler) do
    @routes = @routes ++ [{:get, path, handler}]
  end

  def routes, do: @routes
end
```

## Working with Collections

### Enum (Eager)
```elixir
Enum.map([1, 2, 3], &(&1 * 2))      # [2, 4, 6]
Enum.filter([1, 2, 3], &odd?/1)      # [1, 3]
Enum.reduce([1, 2, 3], 0, &+/2)      # 6
Enum.sort(users, &(&1.age > &2.age)) # Sort by age desc
```

### Stream (Lazy)
```elixir
[1, 2, 3]
|> Stream.map(&(&1 * 2))
|> Stream.filter(&(&1 > 3))
|> Enum.to_list()  # [4, 6]
```
Streams are lazy — no work is done until `Enum.to_list()/1` is called. Use for large collections to avoid intermediate lists.
