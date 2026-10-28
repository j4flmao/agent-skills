# Elixir Language Fundamentals

The core language features every Elixir backend developer uses daily: data types, immutability, pattern matching, functions and modules, the pipe operator, control flow, collections with `Enum`/`Stream`, error handling conventions, processes at a glance, and Mix project basics. OTP behaviours are in `elixir-otp.md`; Ecto and Phoenix in their own references.

## Runtime Model

- Elixir compiles to BEAM bytecode and runs on the Erlang VM (OTP).
- Code runs in lightweight processes with isolated heaps; processes communicate by message passing.
- Data is immutable; "updating" returns a new value (structural sharing keeps it cheap).
- Failures are handled by supervision ("let it crash") rather than defensive code everywhere.

## Basic Types

| Type | Example | Notes |
|------|---------|-------|
| Integer | `42`, `1_000_000` | Arbitrary precision |
| Float | `3.14` | 64-bit |
| Atom | `:ok`, `:error`, `true`, `nil` | Constants; atoms are not garbage collected, never create from user input (`String.to_atom/1`) |
| String | `"héllo"` | UTF-8 binary |
| Charlist | `~c"abc"` | List of code points (Erlang interop) |
| List | `[1, 2, 3]` | Linked list; prepend O(1), length O(n) |
| Tuple | `{:ok, value}` | Fixed size, contiguous |
| Map | `%{"a" => 1, b: 2}` | Key-value |
| Keyword list | `[timeout: 5_000, retries: 3]` | List of 2-tuples with atom keys; ordered, duplicates allowed; used for options |
| Struct | `%User{name: "Ana"}` | Map with fixed keys and a module tag |

## Pattern Matching

`=` is the match operator. Patterns destructure and assert shape at the same time.

```elixir
{:ok, %{"id" => id}} = Jason.decode(~s({"id": 7}))

[head | tail] = [1, 2, 3]          # head = 1, tail = [2, 3]
%{name: name} = %{name: "Ana", age: 30}

# pin operator matches against an existing value instead of rebinding
expected = 7
^expected = id
```

A failed match raises `MatchError`; use `case`/`with` when failure is expected.

## Functions and Modules

```elixir
defmodule Billing.Invoice do
  @moduledoc "Invoice calculations."

  @vat_rate Decimal.new("0.20")

  defstruct [:id, :lines, currency: "EUR"]

  @type t :: %__MODULE__{id: String.t(), lines: [map()], currency: String.t()}

  @spec total(t()) :: Decimal.t()
  def total(%__MODULE__{lines: lines}) do
    lines
    |> Enum.map(&line_total/1)
    |> Enum.reduce(Decimal.new(0), &Decimal.add/2)
    |> add_vat()
  end

  defp line_total(%{qty: qty, unit_price: price}) when qty > 0, do: Decimal.mult(price, qty)

  defp add_vat(amount), do: Decimal.add(amount, Decimal.mult(amount, @vat_rate))
end
```

- `def` public, `defp` private; functions are identified by name and arity (`total/1`).
- Multiple clauses with pattern matching and guards (`when`) replace many `if` chains.
- Anonymous functions: `fn x -> x * 2 end` or capture syntax `&(&1 * 2)`; call with a dot: `fun.(3)`.
- Use `Decimal` (library) for money, never floats.

## Pipe Operator

`|>` passes the result as the first argument of the next call. Design functions so the main data is the first parameter.

```elixir
"  Hello World  "
|> String.trim()
|> String.downcase()
|> String.split()
```

## Control Flow

```elixir
case File.read(path) do
  {:ok, contents} -> parse(contents)
  {:error, :enoent} -> {:error, :not_found}
  {:error, reason} -> {:error, reason}
end

cond do
  age >= 18 -> :adult
  age >= 13 -> :teen
  true -> :child
end

# with: chain operations that return {:ok, _} / {:error, _}
with {:ok, user} <- Accounts.fetch_user(id),
     :ok <- Policy.authorize(user, :refund),
     {:ok, refund} <- Payments.refund(order, user) do
  {:ok, refund}
else
  {:error, :not_found} -> {:error, :user_not_found}
  {:error, reason} -> {:error, reason}
end
```

`if`/`unless` exist for simple boolean checks. Only `false` and `nil` are falsy.

## Collections: Enum and Stream

```elixir
orders
|> Enum.filter(&(&1.status == :paid))
|> Enum.group_by(& &1.customer_id, & &1.total)
|> Map.new(fn {customer, totals} -> {customer, Enum.sum(totals)} end)

# for comprehension with filter and into
for %{active: true, email: email} <- users, into: MapSet.new(), do: String.downcase(email)

# Stream is lazy: good for large or infinite inputs
File.stream!("events.log")
|> Stream.map(&String.trim/1)
|> Stream.reject(&(&1 == ""))
|> Enum.take(100)
```

`Enum` is eager (builds intermediate lists); `Stream` composes lazily and runs when consumed.

## Error Handling Conventions

| Situation | Convention |
|-----------|------------|
| Expected failure | Return `{:ok, value}` / `{:error, reason}` |
| Caller cannot continue meaningfully | Bang variant raising an exception (`File.read!/1`) |
| Unexpected bug | Let it raise; supervisor restarts the process |
| Custom exceptions | `defexception [:message, :order_id]` |

`try/rescue` is for wrapping libraries that raise; it is not the default control flow.

## Strings and Binaries

- Strings are binaries; `byte_size/1` vs `String.length/1` (graphemes).
- Interpolation `"Hi #{name}"`; sigils `~s`, `~r` (regex), `~w` (word list), `~D`/`~U` (dates).
- Binary pattern matching parses protocols efficiently: `<<version::8, len::16, payload::binary-size(len), rest::binary>>`.

## Processes at a Glance

```elixir
parent = self()
pid = spawn(fn -> send(parent, {:result, heavy_work()}) end)

receive do
  {:result, value} -> value
after
  5_000 -> {:error, :timeout}
end

# Task for one-off async work
task = Task.async(fn -> fetch_prices() end)
prices = Task.await(task, 10_000)
```

In applications, start long-lived processes under supervisors (see `elixir-otp.md`) and use `Task.Supervisor` for fire-and-forget work.

## Mix Basics

```bash
mix new billing --sup          # new project with a supervision tree
mix deps.get
mix compile --warnings-as-errors
mix test
mix format --check-formatted
mix credo --strict             # if Credo is a dependency
mix dialyzer                   # if Dialyxir is a dependency
iex -S mix                     # interactive shell with the project loaded
```

`mix.exs` declares the app, deps and Elixir version requirement. Configuration lives in `config/config.exs` (compile time) and `config/runtime.exs` (evaluated at boot; read environment variables here).

## Style

- Formatter (`mix format`) is the standard; commit `.formatter.exs`.
- Name predicate functions `valid?`, guard-safe ones `is_valid`.
- Keep modules small and data-first; document with `@moduledoc`, `@doc`, and typespecs (`@spec`).
- Recent Elixir versions perform gradual type checking at compile time and emit warnings for detected type mismatches; treat them as errors in CI.

## Checklist

- [ ] Pattern matching and multi-clause functions instead of nested conditionals
- [ ] `{:ok, _}/{:error, _}` for expected failures; `with` for chains
- [ ] No atoms created from external input
- [ ] Money as `Decimal`; streams for large data
- [ ] `mix format`, compile warnings as errors, Credo/Dialyzer in CI
- [ ] Runtime configuration in `config/runtime.exs`
